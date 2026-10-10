from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from ...core import seguridad
from ...core.config import Settings
from ...core.errores import Conflicto, CredencialesInvalidas, NoAutenticado, NoEncontrado, UsuarioBloqueado
from ..dominio.entidades import Rol, Sesion, Usuario, ahora
from ..repositorios.interfaces import RepositorioSesiones, RepositorioUsuarios, UnidadDeTrabajo

# Evita escribir en BD en cada petición: la actividad se registra como mucho una vez por minuto.
_INTERVALO_REGISTRO_ACTIVIDAD = timedelta(seconds=60)


@dataclass(frozen=True, slots=True)
class SesionIniciada:
    usuario: Usuario
    token_sesion: str
    token_csrf: str
    expira_en: datetime


@dataclass(frozen=True, slots=True)
class UsuarioAutenticado:
    usuario: Usuario
    sesion: Sesion

    @property
    def es_admin(self) -> bool:
        return self.usuario.rol is Rol.ADMIN


class ServicioAutenticacion:
    def __init__(
        self,
        usuarios: RepositorioUsuarios,
        sesiones: RepositorioSesiones,
        unidad_trabajo: UnidadDeTrabajo,
        settings: Settings,
        reloj: Callable[[], datetime] = ahora,
    ):
        self._usuarios = usuarios
        self._sesiones = sesiones
        self._uow = unidad_trabajo
        self._settings = settings
        self._reloj = reloj

    # ------------------------------------------------------------------ sesión

    def iniciar_sesion(
        self, nombre_usuario: str, contrasena: str, ip: str | None, agente_usuario: str | None
    ) -> SesionIniciada:
        momento = self._reloj()
        usuario = self._usuarios.obtener_por_nombre(nombre_usuario)

        if usuario and usuario.bloqueado_hasta and usuario.bloqueado_hasta > momento:
            raise UsuarioBloqueado("Cuenta bloqueada temporalmente por intentos fallidos. Intente más tarde.")

        valida = seguridad.verificar_contrasena(usuario.hash_contrasena if usuario else None, contrasena)
        if not usuario or not valida or not usuario.activo:
            if usuario:
                self._registrar_intento_fallido(usuario, momento)
            raise CredencialesInvalidas("Usuario o contraseña incorrectos")

        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        if seguridad.requiere_rehash(usuario.hash_contrasena):
            usuario.hash_contrasena = seguridad.hashear_contrasena(contrasena)
        self._usuarios.guardar(usuario)

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
        return SesionIniciada(usuario, token_sesion, token_csrf, expira_en)

    def _registrar_intento_fallido(self, usuario: Usuario, momento: datetime) -> None:
        usuario.intentos_fallidos += 1
        if usuario.intentos_fallidos >= self._settings.max_intentos_fallidos:
            usuario.bloqueado_hasta = momento + timedelta(minutes=self._settings.minutos_bloqueo)
            usuario.intentos_fallidos = 0
        self._usuarios.guardar(usuario)
        # Se confirma antes de responder con error para que el contador persista.
        self._uow.confirmar()

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

    def cerrar_sesion(self, sesion: Sesion) -> None:
        self._sesiones.revocar(sesion.id)

    def purgar_sesiones(self) -> int:
        return self._sesiones.eliminar_expiradas(self._reloj())

    # ------------------------------------------------------------------ usuarios

    def crear_usuario(self, nombre_usuario: str, contrasena: str, rol: Rol) -> Usuario:
        if self._usuarios.obtener_por_nombre(nombre_usuario):
            raise Conflicto(f"El usuario '{nombre_usuario}' ya existe")
        return self._usuarios.guardar(
            Usuario(
                nombre_usuario=nombre_usuario,
                hash_contrasena=seguridad.hashear_contrasena(contrasena),
                rol=rol,
                creado_en=self._reloj(),
            )
        )

    def listar_usuarios(self) -> list[Usuario]:
        return self._usuarios.listar()

    def actualizar_usuario(self, usuario_id: int, rol: Rol | None, activo: bool | None) -> Usuario:
        usuario = self._usuarios.obtener_por_id(usuario_id)
        if usuario is None:
            raise NoEncontrado("Usuario no encontrado")
        if rol is not None:
            usuario.rol = rol
        if activo is not None:
            usuario.activo = activo
            if activo:
                usuario.intentos_fallidos, usuario.bloqueado_hasta = 0, None
        self._usuarios.guardar(usuario)
        if activo is False or rol is not None:
            # Un cambio de privilegios invalida las sesiones abiertas.
            self._sesiones.revocar_de_usuario(usuario.id)
        return usuario

    def cambiar_contrasena(self, usuario: Usuario, actual: str, nueva: str) -> None:
        if not seguridad.verificar_contrasena(usuario.hash_contrasena, actual):
            raise CredencialesInvalidas("La contraseña actual no es correcta")
        usuario.hash_contrasena = seguridad.hashear_contrasena(nueva)
        self._usuarios.guardar(usuario)
        self._sesiones.revocar_de_usuario(usuario.id)

    def asegurar_admin_inicial(self) -> Usuario | None:
        clave = self._settings.admin_contrasena
        if clave is None or self._usuarios.contar() > 0:
            return None
        return self.crear_usuario(self._settings.admin_usuario, clave.get_secret_value(), Rol.ADMIN)
