import hashlib
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from ...core import seguridad, totp
from ...core.config import Settings
from ...core.errores import (
    Conflicto,
    CredencialesInvalidas,
    DemasiadasSolicitudes,
    ErrorDominio,
    NoAutenticado,
    NoEncontrado,
    PermisoDenegado,
)
from ..dominio.entidades import ConteoFallos, DesafioSegundoFactor, Rol, Sesion, Severidad, Usuario, ahora
from ..repositorios.interfaces import (
    RepositorioDesafios,
    RepositorioIntentosAcceso,
    RepositorioSesiones,
    RepositorioUsuarios,
    UnidadDeTrabajo,
)
from .auditoria import ServicioAuditoria

# Evita escribir en BD en cada petición: la actividad se registra como mucho una vez por minuto.
_INTERVALO_REGISTRO_ACTIVIDAD = timedelta(seconds=60)

# Si la petición no trae IP (no debería ocurrir tras el proxy), todos esos intentos comparten cupo.
_IP_DESCONOCIDA = "desconocida"

CANTIDAD_CODIGOS_RECUPERACION = 10


@dataclass(frozen=True, slots=True)
class SesionIniciada:
    usuario: Usuario
    token_sesion: str
    token_csrf: str
    expira_en: datetime


@dataclass(frozen=True, slots=True)
class ResultadoInicio:
    """O bien la sesión quedó abierta, o la contraseña es correcta y falta el código de doble factor."""

    sesion: SesionIniciada | None = None
    token_desafio: str | None = None
    desafio_expira_en: datetime | None = None


@dataclass(frozen=True, slots=True)
class ConfiguracionSegundoFactor:
    secreto: str
    uri: str


@dataclass(frozen=True, slots=True)
class UsuarioAutenticado:
    usuario: Usuario
    sesion: Sesion

    @property
    def es_admin(self) -> bool:
        return self.usuario.rol is Rol.ADMIN


def generar_codigos_recuperacion() -> list[str]:
    """Códigos de un solo uso para entrar si se pierde el teléfono (≈ 50 bits cada uno)."""
    alfabeto = "abcdefghjkmnpqrstuvwxyz23456789"  # sin 0/o ni 1/l/i, que se confunden al copiarlos
    codigos = []
    for _ in range(CANTIDAD_CODIGOS_RECUPERACION):
        crudo = "".join(secrets.choice(alfabeto) for _ in range(10))
        codigos.append(f"{crudo[:5]}-{crudo[5:]}")
    return codigos


def hash_codigo_recuperacion(codigo: str) -> str:
    normalizado = codigo.strip().lower().replace("-", "").replace(" ", "")
    return hashlib.sha256(normalizado.encode()).hexdigest()


class ServicioAutenticacion:
    def __init__(
        self,
        usuarios: RepositorioUsuarios,
        sesiones: RepositorioSesiones,
        intentos: RepositorioIntentosAcceso,
        desafios: RepositorioDesafios,
        unidad_trabajo: UnidadDeTrabajo,
        auditoria: ServicioAuditoria,
        settings: Settings,
        reloj: Callable[[], datetime] = ahora,
    ):
        self._usuarios = usuarios
        self._sesiones = sesiones
        self._intentos = intentos
        self._desafios = desafios
        self._uow = unidad_trabajo
        self._auditoria = auditoria
        self._settings = settings
        self._reloj = reloj

    # ------------------------------------------------------------------ inicio de sesión

    def iniciar_sesion(
        self, nombre_usuario: str, contrasena: str, ip: str | None, agente_usuario: str | None
    ) -> ResultadoInicio:
        momento = self._reloj()
        ip = ip or _IP_DESCONOCIDA
        # Reserva usuario e IP hasta el final de la petición: los contadores se leen y se
        # escriben sin que otro intento simultáneo se cuele en medio.
        self._intentos.reservar(nombre_usuario, ip)
        conteo = self._exigir_cupo_de_intentos(nombre_usuario, ip, momento)

        # Todo lo anterior es idéntico exista o no la cuenta: las respuestas no revelan cuáles existen.
        usuario = self._usuarios.obtener_por_nombre(nombre_usuario)
        valida = seguridad.verificar_contrasena(usuario.hash_contrasena if usuario else None, contrasena)
        if not usuario or not valida or not usuario.activo:
            self._auditoria.registrar("inicio_sesion_fallido", nombre_usuario=nombre_usuario)
            self._registrar_intento_fallido(nombre_usuario, ip, momento, conteo)
            raise CredencialesInvalidas("Usuario o contraseña incorrectos")

        if seguridad.requiere_rehash(usuario.hash_contrasena):
            usuario.hash_contrasena = seguridad.hashear_contrasena(contrasena)
            self._usuarios.guardar(usuario)

        if usuario.totp_activo:
            # Los fallos no se limpian todavía: los códigos incorrectos siguen sumando al mismo cupo.
            token = seguridad.generar_token()
            expira_en = momento + timedelta(minutes=self._settings.minutos_desafio_segundo_factor)
            self._desafios.eliminar_de_usuario(usuario.id)
            self._desafios.crear(
                DesafioSegundoFactor(
                    usuario_id=usuario.id,
                    hash_token=seguridad.hashear_token(token),
                    expira_en=expira_en,
                    ip=ip,
                    creado_en=momento,
                )
            )
            return ResultadoInicio(token_desafio=token, desafio_expira_en=expira_en)

        return ResultadoInicio(sesion=self._abrir_sesion(usuario, ip, agente_usuario, momento))

    def verificar_segundo_factor(
        self, token_desafio: str | None, codigo: str, ip: str | None, agente_usuario: str | None
    ) -> SesionIniciada:
        momento = self._reloj()
        ip = ip or _IP_DESCONOCIDA
        expirado = NoAutenticado("El intento de inicio de sesión expiró. Ingrese de nuevo su contraseña.")
        desafio = (
            self._desafios.obtener_vigente(seguridad.hashear_token(token_desafio), momento)
            if token_desafio
            else None
        )
        if desafio is None:
            raise expirado
        usuario = self._usuarios.obtener_por_id(desafio.usuario_id)
        if usuario is None or not usuario.activo or not usuario.totp_activo or not usuario.totp_secreto:
            raise expirado

        self._intentos.reservar(usuario.nombre_usuario, ip)
        conteo = self._exigir_cupo_de_intentos(usuario.nombre_usuario, ip, momento)

        paso = totp.verificar(usuario.totp_secreto, codigo, momento, usuario.totp_ultimo_paso)
        if paso is not None:
            usuario.totp_ultimo_paso = paso
        elif (huella := hash_codigo_recuperacion(codigo)) in usuario.codigos_recuperacion:
            usuario.codigos_recuperacion.remove(huella)
            self._auditoria.registrar(
                "codigo_recuperacion_usado",
                Severidad.ADVERTENCIA,
                usuario=usuario,
                restantes=len(usuario.codigos_recuperacion),
            )
        else:
            self._auditoria.registrar("segundo_factor_fallido", Severidad.ADVERTENCIA, usuario=usuario)
            self._registrar_intento_fallido(usuario.nombre_usuario, ip, momento, conteo)
            raise CredencialesInvalidas("Código incorrecto")

        self._usuarios.guardar(usuario)
        self._desafios.eliminar_de_usuario(usuario.id)
        return self._abrir_sesion(usuario, ip, agente_usuario, momento)

    def _abrir_sesion(
        self, usuario: Usuario, ip: str, agente_usuario: str | None, momento: datetime
    ) -> SesionIniciada:
        self._intentos.limpiar(usuario.nombre_usuario, ip)
        # Token nuevo en cada inicio de sesión: evita la fijación de sesión.
        token_sesion, token_csrf = seguridad.generar_token(), seguridad.generar_token()
        expira_en = momento + timedelta(hours=self._settings.sesion_horas_absolutas)
        self._sesiones.crear(
            Sesion(
                usuario_id=usuario.id,
                hash_token=seguridad.hashear_token(token_sesion),
                hash_csrf=seguridad.hashear_token(token_csrf),
                expira_en=expira_en,
                ultima_actividad=momento,
                creada_en=momento,
                ip=ip,
                agente_usuario=(agente_usuario or "")[:255] or None,
            )
        )
        self._auditoria.registrar("inicio_sesion", usuario=usuario, segundo_factor=usuario.totp_activo)
        # Limpieza periódica sin tareas programadas: cada inicio de sesión borra las que ya no sirven.
        self.purgar_sesiones()
        return SesionIniciada(usuario, token_sesion, token_csrf, expira_en)

    def _exigir_cupo_de_intentos(self, nombre_usuario: str, ip: str, momento: datetime) -> ConteoFallos:
        """Tres topes en la misma ventana: usuario+IP (el habitual), usuario desde cualquier IP
        (ataque distribuido contra una cuenta) e IP contra cualquier usuario (rociado de
        contraseñas). El mensaje no dice cuál se alcanzó."""
        config = self._settings
        conteo = self._intentos.contar_fallos(nombre_usuario, ip, momento - self._ventana)
        if (
            conteo.por_usuario_e_ip >= config.max_intentos_fallidos
            or conteo.por_usuario >= config.max_intentos_fallidos_por_usuario
            or conteo.por_ip >= config.max_intentos_fallidos_por_ip
        ):
            raise DemasiadasSolicitudes(
                f"Demasiados intentos fallidos. Espere {config.minutos_bloqueo} minutos e intente de nuevo."
            )
        return conteo

    def _registrar_intento_fallido(
        self, nombre_usuario: str, ip: str, momento: datetime, conteo: ConteoFallos
    ) -> None:
        self._intentos.registrar_fallo(nombre_usuario, ip, momento)
        # Los registros fuera de la ventana ya no cuentan: la tabla no crece sin límite.
        self._intentos.eliminar_anteriores(momento - self._ventana)
        # Se confirma antes de responder con error para que el fallo quede registrado.
        self._uow.confirmar()

        # Alerta solo al alcanzar cada tope (no en cada intento rechazado después).
        config = self._settings
        if conteo.por_usuario + 1 == config.max_intentos_fallidos_por_usuario:
            self._auditoria.registrar(
                "ataque_distribuido_a_cuenta", Severidad.CRITICA, nombre_usuario=nombre_usuario
            )
        if conteo.por_ip + 1 == config.max_intentos_fallidos_por_ip:
            self._auditoria.registrar(
                "rociado_de_contrasenas", Severidad.CRITICA, nombre_usuario=nombre_usuario
            )
        if conteo.por_usuario_e_ip + 1 == config.max_intentos_fallidos:
            self._auditoria.registrar(
                "acceso_bloqueado", Severidad.ADVERTENCIA, nombre_usuario=nombre_usuario
            )

    @property
    def _ventana(self) -> timedelta:
        return timedelta(minutes=self._settings.minutos_bloqueo)

    # ------------------------------------------------------------------ sesión abierta

    def autenticar(self, token_sesion: str | None) -> UsuarioAutenticado:
        if not token_sesion:
            raise NoAutenticado("Sesión no iniciada")
        sesion = self._sesiones.obtener_por_hash_token(seguridad.hashear_token(token_sesion))
        momento = self._reloj()
        inactividad = timedelta(minutes=self._settings.sesion_minutos_inactividad)
        if (
            sesion is None
            or sesion.revocada
            or sesion.expira_en <= momento
            or sesion.ultima_actividad + inactividad <= momento
        ):
            raise NoAutenticado("Sesión inválida o expirada")

        usuario = self._usuarios.obtener_por_id(sesion.usuario_id)
        if usuario is None or not usuario.activo:
            self._sesiones.revocar(sesion.id)
            raise NoAutenticado("Sesión inválida o expirada")

        if momento - sesion.ultima_actividad >= _INTERVALO_REGISTRO_ACTIVIDAD:
            self._sesiones.actualizar_actividad(sesion.id, momento)
            sesion.ultima_actividad = momento
        return UsuarioAutenticado(usuario, sesion)

    @staticmethod
    def csrf_valido(sesion: Sesion, token_csrf: str | None) -> bool:
        return bool(token_csrf) and seguridad.tokens_iguales(
            seguridad.hashear_token(token_csrf), sesion.hash_csrf
        )

    def cerrar_sesion(self, actual: UsuarioAutenticado) -> None:
        self._sesiones.revocar(actual.sesion.id)
        self._auditoria.registrar("cierre_sesion", usuario=actual.usuario)

    def purgar_sesiones(self) -> int:
        momento = self._reloj()
        self._intentos.eliminar_anteriores(momento - self._ventana)
        self._desafios.eliminar_expirados(momento)
        inactividad = timedelta(minutes=self._settings.sesion_minutos_inactividad)
        return self._sesiones.eliminar_expiradas(momento, momento - inactividad)

    # ------------------------------------------------------------------ doble factor

    def iniciar_configuracion_segundo_factor(
        self, usuario: Usuario, contrasena: str, ip: str | None
    ) -> ConfiguracionSegundoFactor:
        """Genera un secreto nuevo (pendiente hasta confirmarlo con un código). Pide la contraseña:
        una sesión robada no basta para atar la cuenta al teléfono de otra persona."""
        momento, ip = self._reloj(), ip or _IP_DESCONOCIDA
        self._intentos.reservar(usuario.nombre_usuario, ip)
        conteo = self._exigir_cupo_de_intentos(usuario.nombre_usuario, ip, momento)
        usuario = self._usuarios.obtener_por_id(usuario.id) or usuario
        if not seguridad.verificar_contrasena(usuario.hash_contrasena, contrasena):
            self._registrar_intento_fallido(usuario.nombre_usuario, ip, momento, conteo)
            raise CredencialesInvalidas("La contraseña no es correcta")
        if usuario.totp_activo:
            raise Conflicto("La verificación en dos pasos ya está activa")

        usuario.totp_secreto = totp.generar_secreto()
        usuario.totp_ultimo_paso = None
        self._usuarios.guardar(usuario)
        self._auditoria.registrar("segundo_factor_configuracion_iniciada", usuario=usuario)
        uri = totp.uri_aprovisionamiento(
            usuario.totp_secreto, usuario.nombre_usuario, self._settings.emisor_segundo_factor
        )
        return ConfiguracionSegundoFactor(secreto=usuario.totp_secreto, uri=uri)

    def activar_segundo_factor(self, usuario: Usuario, codigo: str) -> list[str]:
        """Confirma el secreto con un código de la app, entrega los códigos de recuperación (solo
        esta vez) y cierra todas las sesiones: se vuelve a entrar ya con doble factor."""
        usuario = self._usuarios.obtener_por_id(usuario.id) or usuario
        if usuario.totp_activo:
            raise Conflicto("La verificación en dos pasos ya está activa")
        if not usuario.totp_secreto:
            raise ErrorDominio("Primero inicie la configuración de la verificación en dos pasos")
        paso = totp.verificar(usuario.totp_secreto, codigo, self._reloj(), None)
        if paso is None:
            raise CredencialesInvalidas(
                "Código incorrecto. Verifique que la hora del teléfono sea la correcta."
            )

        codigos = generar_codigos_recuperacion()
        usuario.totp_activo = True
        usuario.totp_ultimo_paso = paso
        usuario.codigos_recuperacion = [hash_codigo_recuperacion(c) for c in codigos]
        self._usuarios.guardar(usuario)
        self._sesiones.revocar_de_usuario(usuario.id)
        self._auditoria.registrar("segundo_factor_activado", usuario=usuario)
        return codigos

    def desactivar_segundo_factor(self, usuario: Usuario, contrasena: str, codigo: str) -> None:
        if usuario.rol is Rol.ADMIN and self._settings.exigir_segundo_factor_admin:
            raise PermisoDenegado("La verificación en dos pasos es obligatoria para los administradores")
        usuario = self._usuarios.obtener_por_id(usuario.id) or usuario
        if not usuario.totp_activo or not usuario.totp_secreto:
            raise Conflicto("La verificación en dos pasos no está activa")
        if not seguridad.verificar_contrasena(usuario.hash_contrasena, contrasena) or (
            totp.verificar(usuario.totp_secreto, codigo, self._reloj(), usuario.totp_ultimo_paso) is None
        ):
            raise CredencialesInvalidas("Contraseña o código incorrectos")
        self._quitar_segundo_factor(usuario)
        self._auditoria.registrar("segundo_factor_desactivado", Severidad.ADVERTENCIA, usuario=usuario)

    def restablecer_segundo_factor(self, usuario_id: int, administrador: Usuario) -> Usuario:
        """Para quien perdió el teléfono y los códigos: lo hace OTRO administrador."""
        if usuario_id == administrador.id:
            raise Conflicto("Otro administrador debe restablecer su verificación en dos pasos")
        usuario = self._usuarios.obtener_por_id(usuario_id)
        if usuario is None:
            raise NoEncontrado("Usuario no encontrado")
        self._quitar_segundo_factor(usuario)
        self._auditoria.registrar("segundo_factor_restablecido", Severidad.CRITICA, usuario=usuario)
        return usuario

    def _quitar_segundo_factor(self, usuario: Usuario) -> None:
        usuario.totp_secreto = None
        usuario.totp_activo = False
        usuario.totp_ultimo_paso = None
        usuario.codigos_recuperacion = []
        self._usuarios.guardar(usuario)
        self._desafios.eliminar_de_usuario(usuario.id)
        self._sesiones.revocar_de_usuario(usuario.id)

    # ------------------------------------------------------------------ usuarios

    def crear_usuario(self, nombre_usuario: str, contrasena: str, rol: Rol) -> Usuario:
        """La contraseña la fija otra persona (el administrador o la configuración inicial): el
        usuario debe reemplazarla en su primer ingreso."""
        if self._usuarios.obtener_por_nombre(nombre_usuario):
            raise Conflicto(f"El usuario '{nombre_usuario}' ya existe")
        usuario = self._usuarios.guardar(
            Usuario(
                nombre_usuario=nombre_usuario,
                hash_contrasena=seguridad.hashear_contrasena(contrasena),
                rol=rol,
                debe_cambiar_contrasena=True,
                creado_en=self._reloj(),
            )
        )
        severidad = Severidad.CRITICA if rol is Rol.ADMIN else Severidad.INFO
        self._auditoria.registrar("usuario_creado", severidad, usuario=usuario, rol=rol.value)
        return usuario

    def listar_usuarios(self) -> list[Usuario]:
        return self._usuarios.listar()

    def actualizar_usuario(self, usuario_id: int, rol: Rol | None, activo: bool | None) -> Usuario:
        usuario = self._usuarios.obtener_por_id(usuario_id)
        if usuario is None:
            raise NoEncontrado("Usuario no encontrado")
        pierde_admin = (
            usuario.rol is Rol.ADMIN
            and usuario.activo
            and ((rol is not None and rol is not Rol.ADMIN) or activo is False)
        )
        if pierde_admin and self._usuarios.contar_admins_activos_bloqueando() <= 1:
            raise Conflicto(
                "Debe quedar al menos un administrador activo: asigne el rol a otro usuario primero."
            )
        cambios: dict[str, str | bool] = {}
        gana_admin = rol is Rol.ADMIN and usuario.rol is not Rol.ADMIN
        if rol is not None and rol is not usuario.rol:
            cambios["rol"] = rol.value
            usuario.rol = rol
        if activo is not None and activo != usuario.activo:
            cambios["activo"] = activo
            usuario.activo = activo
        if activo:
            # Reactivar también levanta los bloqueos por intentos fallidos.
            self._intentos.limpiar(usuario.nombre_usuario)
        self._usuarios.guardar(usuario)
        if activo is False or rol is not None:
            # Un cambio de privilegios invalida las sesiones abiertas.
            self._sesiones.revocar_de_usuario(usuario.id)
        if cambios:
            severidad = (
                Severidad.CRITICA
                if gana_admin
                else Severidad.ADVERTENCIA
                if pierde_admin or activo is False
                else Severidad.INFO
            )
            self._auditoria.registrar("usuario_actualizado", severidad, usuario=usuario, **cambios)
        return usuario

    def cambiar_contrasena(self, usuario: Usuario, actual: str, nueva: str) -> None:
        # Espera a que termine cualquier inicio de sesión en curso de esta cuenta: si no, uno que
        # ya validó la contraseña vieja crearía su sesión después de la revocación y sobreviviría.
        self._intentos.esperar_usuario(usuario.nombre_usuario)
        usuario = self._usuarios.obtener_por_id(usuario.id) or usuario
        if not seguridad.verificar_contrasena(usuario.hash_contrasena, actual):
            self._auditoria.registrar("cambio_contrasena_fallido", Severidad.ADVERTENCIA, usuario=usuario)
            raise CredencialesInvalidas("La contraseña actual no es correcta")
        if actual == nueva:
            raise ErrorDominio("La nueva contraseña debe ser distinta de la actual")
        usuario.hash_contrasena = seguridad.hashear_contrasena(nueva)
        usuario.debe_cambiar_contrasena = False
        self._usuarios.guardar(usuario)
        self._sesiones.revocar_de_usuario(usuario.id)
        self._auditoria.registrar("contrasena_cambiada", usuario=usuario)

    def asegurar_admin_inicial(self) -> Usuario | None:
        clave = self._settings.admin_contrasena
        if clave is None or self._usuarios.contar() > 0:
            return None
        return self.crear_usuario(self._settings.admin_usuario, clave.get_secret_value(), Rol.ADMIN)
