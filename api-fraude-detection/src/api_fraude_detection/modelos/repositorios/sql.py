"""Implementaciones de los repositorios sobre SQLAlchemy + PostgreSQL."""

from datetime import datetime

from sqlalchemy import and_, delete, func, insert, or_, select, text, update
from sqlalchemy.orm import Session, sessionmaker

from ...core.cifrado import (
    CONTEXTO_ANALISIS_DESCRIPCION,
    CONTEXTO_ANALISIS_RESULTADO,
    CONTEXTO_TOTP_SECRETO,
    Cifrador,
)
from ...core.errores import DemasiadasSolicitudes
from ..dominio.entidades import (
    ConteoFallos,
    DesafioSegundoFactor,
    EventoAuditoria,
    PerfilDeteccion,
    RegistroAnalisis,
    Rol,
    Sesion,
    Severidad,
    Usuario,
)
from ..dominio.parametros import NivelRiesgo, ParametrosDeteccion
from ..persistencia.tablas import (
    AnalisisORM,
    DesafioSegundoFactorORM,
    EventoAuditoriaORM,
    IntentoAccesoORM,
    PerfilDeteccionORM,
    SesionORM,
    UsuarioORM,
)
from .interfaces import (
    RepositorioAnalisis,
    RepositorioAuditoria,
    RepositorioDesafios,
    RepositorioIntentosAcceso,
    RepositorioPerfiles,
    RepositorioSesiones,
    RepositorioUsuarios,
    UnidadDeTrabajo,
)


class RepositorioUsuariosSQL(RepositorioUsuarios):
    def __init__(self, sesion: Session, cifrador: Cifrador):
        self._db = sesion
        self._cifrador = cifrador

    def _a_entidad(self, fila: UsuarioORM) -> Usuario:
        secreto = fila.totp_secreto
        return Usuario(
            id=fila.id,
            nombre_usuario=fila.nombre_usuario,
            hash_contrasena=fila.hash_contrasena,
            rol=Rol(fila.rol),
            activo=fila.activo,
            debe_cambiar_contrasena=fila.debe_cambiar_contrasena,
            totp_secreto=self._cifrador.descifrar_texto(secreto, CONTEXTO_TOTP_SECRETO) if secreto else None,
            totp_activo=fila.totp_activo,
            totp_ultimo_paso=fila.totp_ultimo_paso,
            codigos_recuperacion=list(fila.codigos_recuperacion or []),
            creado_en=fila.creado_en,
        )

    def obtener_por_id(self, usuario_id: int) -> Usuario | None:
        fila = self._db.get(UsuarioORM, usuario_id)
        return self._a_entidad(fila) if fila else None

    def obtener_por_nombre(self, nombre_usuario: str) -> Usuario | None:
        fila = self._db.scalar(select(UsuarioORM).where(UsuarioORM.nombre_usuario == nombre_usuario))
        return self._a_entidad(fila) if fila else None

    def listar(self) -> list[Usuario]:
        filas = self._db.scalars(select(UsuarioORM).order_by(UsuarioORM.id))
        return [self._a_entidad(f) for f in filas]

    def contar(self) -> int:
        return self._db.scalar(select(func.count()).select_from(UsuarioORM)) or 0

    def contar_admins_activos_bloqueando(self) -> int:
        ids = self._db.scalars(
            select(UsuarioORM.id)
            .where(UsuarioORM.rol == Rol.ADMIN.value, UsuarioORM.activo)
            .with_for_update()
        ).all()
        return len(ids)

    def guardar(self, usuario: Usuario) -> Usuario:
        fila = self._db.get(UsuarioORM, usuario.id) if usuario.id else UsuarioORM()
        fila.nombre_usuario = usuario.nombre_usuario
        fila.hash_contrasena = usuario.hash_contrasena
        fila.rol = usuario.rol.value
        fila.activo = usuario.activo
        fila.debe_cambiar_contrasena = usuario.debe_cambiar_contrasena
        if usuario.totp_secreto is None:
            fila.totp_secreto = None
        elif fila.totp_secreto is None or self._a_entidad(fila).totp_secreto != usuario.totp_secreto:
            # Se recifra solo si cambió (cada cifrado usa un nonce nuevo y marcaría la fila como modificada).
            fila.totp_secreto = self._cifrador.cifrar_texto(usuario.totp_secreto, CONTEXTO_TOTP_SECRETO)
        fila.totp_activo = usuario.totp_activo
        fila.totp_ultimo_paso = usuario.totp_ultimo_paso
        fila.codigos_recuperacion = list(usuario.codigos_recuperacion)
        fila.creado_en = usuario.creado_en
        self._db.add(fila)
        self._db.flush()
        usuario.id = fila.id
        return usuario


# Espacio propio de bloqueos consultivos (forma de dos claves int4, que no se solapa con los
# bloqueos de una sola clave de las migraciones y los datos iniciales).
_ESPACIO_BLOQUEOS_ACCESO = 0x0FA1


class RepositorioIntentosAccesoSQL(RepositorioIntentosAcceso):
    def __init__(self, sesion: Session):
        self._db = sesion

    _CLAVE_USUARIO = "hashtext('usuario:' || :usuario)"

    def esperar_usuario(self, nombre_usuario: str) -> None:
        self._db.execute(
            text(f"SELECT pg_advisory_xact_lock(:espacio, {self._CLAVE_USUARIO})"),
            {"espacio": _ESPACIO_BLOQUEOS_ACCESO, "usuario": nombre_usuario},
        )

    def reservar(self, nombre_usuario: str, ip: str) -> None:
        # pg_try_advisory_xact_lock no espera: si otro intento tiene la reserva se rechaza al
        # instante (esperar retendría hilos y conexiones del pool durante un ataque). Se libera
        # sola al terminar la transacción. Funciona aunque el usuario no exista.
        reservado = self._db.execute(
            text(
                f"SELECT pg_try_advisory_xact_lock(:espacio, {self._CLAVE_USUARIO})"
                " AND pg_try_advisory_xact_lock(:espacio, hashtext('ip:' || :ip))"
            ),
            {"espacio": _ESPACIO_BLOQUEOS_ACCESO, "usuario": nombre_usuario, "ip": ip},
        ).scalar_one()
        if not reservado:
            raise DemasiadasSolicitudes(
                "Hay otro inicio de sesión en curso. Intente de nuevo en unos segundos."
            )

    def contar_fallos(self, nombre_usuario: str, ip: str, desde: datetime) -> ConteoFallos:
        t = IntentoAccesoORM
        mismo_usuario, misma_ip = t.nombre_usuario == nombre_usuario, t.ip == ip
        fila = self._db.execute(
            select(
                func.count().filter(and_(mismo_usuario, misma_ip)),
                func.count().filter(mismo_usuario),
                func.count().filter(misma_ip),
            ).where(t.creado_en >= desde, or_(mismo_usuario, misma_ip))
        ).one()
        return ConteoFallos(por_usuario_e_ip=fila[0], por_usuario=fila[1], por_ip=fila[2])

    def registrar_fallo(self, nombre_usuario: str, ip: str, momento: datetime) -> None:
        self._db.execute(
            insert(IntentoAccesoORM).values(nombre_usuario=nombre_usuario, ip=ip, creado_en=momento)
        )

    def limpiar(self, nombre_usuario: str, ip: str | None = None) -> None:
        consulta = delete(IntentoAccesoORM).where(IntentoAccesoORM.nombre_usuario == nombre_usuario)
        if ip is not None:
            consulta = consulta.where(IntentoAccesoORM.ip == ip)
        self._db.execute(consulta)

    def eliminar_anteriores(self, momento: datetime) -> int:
        resultado = self._db.execute(delete(IntentoAccesoORM).where(IntentoAccesoORM.creado_en < momento))
        return resultado.rowcount


class RepositorioSesionesSQL(RepositorioSesiones):
    def __init__(self, sesion: Session):
        self._db = sesion

    @staticmethod
    def _a_entidad(fila: SesionORM) -> Sesion:
        return Sesion(
            id=fila.id,
            usuario_id=fila.usuario_id,
            hash_token=fila.hash_token,
            hash_csrf=fila.hash_csrf,
            expira_en=fila.expira_en,
            ultima_actividad=fila.ultima_actividad,
            creada_en=fila.creada_en,
            ip=fila.ip,
            agente_usuario=fila.agente_usuario,
            revocada=fila.revocada,
        )

    def crear(self, sesion: Sesion) -> Sesion:
        fila = SesionORM(
            usuario_id=sesion.usuario_id,
            hash_token=sesion.hash_token,
            hash_csrf=sesion.hash_csrf,
            expira_en=sesion.expira_en,
            ultima_actividad=sesion.ultima_actividad,
            creada_en=sesion.creada_en,
            ip=sesion.ip,
            agente_usuario=sesion.agente_usuario,
            revocada=sesion.revocada,
        )
        self._db.add(fila)
        self._db.flush()
        sesion.id = fila.id
        return sesion

    def obtener_por_hash_token(self, hash_token: str) -> Sesion | None:
        fila = self._db.scalar(select(SesionORM).where(SesionORM.hash_token == hash_token))
        return self._a_entidad(fila) if fila else None

    def actualizar_actividad(self, sesion_id: int, momento: datetime) -> None:
        self._db.execute(update(SesionORM).where(SesionORM.id == sesion_id).values(ultima_actividad=momento))

    def revocar(self, sesion_id: int) -> None:
        self._db.execute(update(SesionORM).where(SesionORM.id == sesion_id).values(revocada=True))

    def revocar_de_usuario(self, usuario_id: int) -> None:
        self._db.execute(update(SesionORM).where(SesionORM.usuario_id == usuario_id).values(revocada=True))

    def eliminar_expiradas(self, momento: datetime, inactivas_desde: datetime) -> int:
        resultado = self._db.execute(
            delete(SesionORM).where(
                (SesionORM.expira_en < momento)
                | SesionORM.revocada.is_(True)
                | (SesionORM.ultima_actividad < inactivas_desde)
            )
        )
        return resultado.rowcount or 0


class RepositorioPerfilesSQL(RepositorioPerfiles):
    def __init__(self, sesion: Session):
        self._db = sesion

    @staticmethod
    def _a_entidad(fila: PerfilDeteccionORM) -> PerfilDeteccion:
        return PerfilDeteccion(
            id=fila.id,
            nombre=fila.nombre,
            descripcion=fila.descripcion,
            parametros=ParametrosDeteccion.model_validate(fila.parametros),
            predeterminado=fila.predeterminado,
            creado_por=fila.creado_por,
            creado_en=fila.creado_en,
            actualizado_en=fila.actualizado_en,
        )

    def obtener_por_id(self, perfil_id: int) -> PerfilDeteccion | None:
        fila = self._db.get(PerfilDeteccionORM, perfil_id)
        return self._a_entidad(fila) if fila else None

    def obtener_por_nombre(self, nombre: str) -> PerfilDeteccion | None:
        fila = self._db.scalar(select(PerfilDeteccionORM).where(PerfilDeteccionORM.nombre == nombre))
        return self._a_entidad(fila) if fila else None

    def obtener_predeterminado(self) -> PerfilDeteccion | None:
        fila = self._db.scalar(select(PerfilDeteccionORM).where(PerfilDeteccionORM.predeterminado.is_(True)))
        return self._a_entidad(fila) if fila else None

    def listar(self) -> list[PerfilDeteccion]:
        filas = self._db.scalars(select(PerfilDeteccionORM).order_by(PerfilDeteccionORM.id))
        return [self._a_entidad(f) for f in filas]

    def guardar(self, perfil: PerfilDeteccion) -> PerfilDeteccion:
        fila = self._db.get(PerfilDeteccionORM, perfil.id) if perfil.id else PerfilDeteccionORM()
        fila.nombre = perfil.nombre
        fila.descripcion = perfil.descripcion
        fila.parametros = perfil.parametros.model_dump(mode="json")
        fila.predeterminado = perfil.predeterminado
        fila.creado_por = perfil.creado_por
        fila.creado_en = perfil.creado_en
        fila.actualizado_en = perfil.actualizado_en
        self._db.add(fila)
        self._db.flush()
        perfil.id = fila.id
        return perfil

    def eliminar(self, perfil_id: int) -> None:
        self._db.execute(delete(PerfilDeteccionORM).where(PerfilDeteccionORM.id == perfil_id))

    def quitar_predeterminado(self, excepto_id: int | None = None) -> None:
        consulta = update(PerfilDeteccionORM).values(predeterminado=False)
        if excepto_id is not None:
            consulta = consulta.where(PerfilDeteccionORM.id != excepto_id)
        self._db.execute(consulta)


class RepositorioAnalisisSQL(RepositorioAnalisis):
    """Descripción y resultado viajan cifrados a la base y se descifran al leerlos."""

    def __init__(self, sesion: Session, cifrador: Cifrador):
        self._db = sesion
        self._cifrador = cifrador

    def _a_entidad(self, fila: AnalisisORM) -> RegistroAnalisis:
        return RegistroAnalisis(
            id=fila.id,
            usuario_id=fila.usuario_id,
            perfil_id=fila.perfil_id,
            descripcion=self._cifrador.descifrar_texto(fila.descripcion, CONTEXTO_ANALISIS_DESCRIPCION),
            parametros=fila.parametros,
            resultado=self._cifrador.descifrar_json(fila.resultado, CONTEXTO_ANALISIS_RESULTADO),
            puntaje=fila.puntaje,
            nivel_riesgo=NivelRiesgo(fila.nivel_riesgo),
            total_transacciones=fila.total_transacciones,
            creado_en=fila.creado_en,
        )

    def guardar(self, registro: RegistroAnalisis) -> RegistroAnalisis:
        fila = AnalisisORM(
            usuario_id=registro.usuario_id,
            perfil_id=registro.perfil_id,
            descripcion=self._cifrador.cifrar_texto(registro.descripcion, CONTEXTO_ANALISIS_DESCRIPCION),
            parametros=registro.parametros,
            resultado=self._cifrador.cifrar_json(registro.resultado, CONTEXTO_ANALISIS_RESULTADO),
            puntaje=registro.puntaje,
            nivel_riesgo=registro.nivel_riesgo.value,
            total_transacciones=registro.total_transacciones,
            creado_en=registro.creado_en,
        )
        self._db.add(fila)
        self._db.flush()
        registro.id = fila.id
        return registro

    def obtener_por_id(self, analisis_id: int) -> RegistroAnalisis | None:
        fila = self._db.get(AnalisisORM, analisis_id)
        return self._a_entidad(fila) if fila else None

    def listar(
        self, usuario_id: int | None = None, limite: int = 50, desplazamiento: int = 0
    ) -> list[RegistroAnalisis]:
        consulta = select(AnalisisORM).order_by(AnalisisORM.creado_en.desc(), AnalisisORM.id.desc())
        if usuario_id is not None:
            consulta = consulta.where(AnalisisORM.usuario_id == usuario_id)
        filas = self._db.scalars(consulta.limit(limite).offset(desplazamiento))
        return [self._a_entidad(f) for f in filas]


class RepositorioDesafiosSQL(RepositorioDesafios):
    def __init__(self, sesion: Session):
        self._db = sesion

    @staticmethod
    def _a_entidad(fila: DesafioSegundoFactorORM) -> DesafioSegundoFactor:
        return DesafioSegundoFactor(
            id=fila.id,
            usuario_id=fila.usuario_id,
            hash_token=fila.hash_token,
            expira_en=fila.expira_en,
            ip=fila.ip,
            creado_en=fila.creado_en,
        )

    def crear(self, desafio: DesafioSegundoFactor) -> DesafioSegundoFactor:
        fila = DesafioSegundoFactorORM(
            usuario_id=desafio.usuario_id,
            hash_token=desafio.hash_token,
            expira_en=desafio.expira_en,
            ip=desafio.ip,
            creado_en=desafio.creado_en,
        )
        self._db.add(fila)
        self._db.flush()
        desafio.id = fila.id
        return desafio

    def obtener_vigente(self, hash_token: str, momento: datetime) -> DesafioSegundoFactor | None:
        fila = self._db.scalar(
            select(DesafioSegundoFactorORM).where(
                DesafioSegundoFactorORM.hash_token == hash_token, DesafioSegundoFactorORM.expira_en > momento
            )
        )
        return self._a_entidad(fila) if fila else None

    def eliminar_de_usuario(self, usuario_id: int) -> None:
        self._db.execute(
            delete(DesafioSegundoFactorORM).where(DesafioSegundoFactorORM.usuario_id == usuario_id)
        )

    def eliminar_expirados(self, momento: datetime) -> int:
        resultado = self._db.execute(
            delete(DesafioSegundoFactorORM).where(DesafioSegundoFactorORM.expira_en <= momento)
        )
        return resultado.rowcount or 0


class RepositorioAuditoriaSQL(RepositorioAuditoria):
    """Escribe cada evento en su propia transacción (otra conexión del pool): queda registrado
    aunque la petición que lo originó termine en error y se deshaga."""

    def __init__(self, fabrica: sessionmaker[Session]):
        self._fabrica = fabrica

    @staticmethod
    def _a_entidad(fila: EventoAuditoriaORM) -> EventoAuditoria:
        return EventoAuditoria(
            id=fila.id,
            momento=fila.momento,
            tipo=fila.tipo,
            severidad=Severidad(fila.severidad),
            usuario_id=fila.usuario_id,
            nombre_usuario=fila.nombre_usuario,
            ip=fila.ip,
            detalle=dict(fila.detalle or {}),
        )

    def registrar(self, evento: EventoAuditoria) -> EventoAuditoria:
        with self._fabrica.begin() as db:
            fila = EventoAuditoriaORM(
                momento=evento.momento,
                tipo=evento.tipo,
                severidad=evento.severidad.value,
                usuario_id=evento.usuario_id,
                nombre_usuario=evento.nombre_usuario,
                ip=evento.ip,
                detalle=evento.detalle,
            )
            db.add(fila)
            db.flush()
            evento.id = fila.id
        return evento

    def listar(
        self, severidades: list[Severidad] | None = None, limite: int = 50, desplazamiento: int = 0
    ) -> list[EventoAuditoria]:
        consulta = select(EventoAuditoriaORM).order_by(
            EventoAuditoriaORM.momento.desc(), EventoAuditoriaORM.id.desc()
        )
        if severidades:
            consulta = consulta.where(EventoAuditoriaORM.severidad.in_([s.value for s in severidades]))
        with self._fabrica() as db:
            return [self._a_entidad(f) for f in db.scalars(consulta.limit(limite).offset(desplazamiento))]


class UnidadDeTrabajoSQL(UnidadDeTrabajo):
    def __init__(self, sesion: Session):
        self._db = sesion

    def confirmar(self) -> None:
        self._db.commit()
