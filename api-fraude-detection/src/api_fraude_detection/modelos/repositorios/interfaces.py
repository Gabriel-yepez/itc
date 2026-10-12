"""Contratos de persistencia. Los servicios dependen solo de estas abstracciones;
la implementación concreta (SQLAlchemy, memoria, ...) se inyecta en `api/dependencias.py`.
"""

from abc import ABC, abstractmethod
from datetime import datetime

from ..dominio.entidades import (
    ConteoFallos,
    DesafioSegundoFactor,
    EventoAuditoria,
    PerfilDeteccion,
    RegistroAnalisis,
    Sesion,
    Severidad,
    Usuario,
)


class RepositorioUsuarios(ABC):
    @abstractmethod
    def obtener_por_id(self, usuario_id: int) -> Usuario | None: ...

    @abstractmethod
    def obtener_por_nombre(self, nombre_usuario: str) -> Usuario | None: ...

    @abstractmethod
    def listar(self) -> list[Usuario]: ...

    @abstractmethod
    def contar(self) -> int: ...

    @abstractmethod
    def contar_admins_activos_bloqueando(self) -> int:
        """Cuenta los administradores activos y los bloquea hasta el fin de la transacción, para
        que dos cambios simultáneos no dejen el sistema sin ninguno."""

    @abstractmethod
    def guardar(self, usuario: Usuario) -> Usuario:
        """Crea el usuario si no tiene id; si lo tiene, lo actualiza."""


class RepositorioDesafios(ABC):
    """Inicios de sesión con la contraseña ya validada que esperan el código de doble factor."""

    @abstractmethod
    def crear(self, desafio: DesafioSegundoFactor) -> DesafioSegundoFactor: ...

    @abstractmethod
    def obtener_vigente(self, hash_token: str, momento: datetime) -> DesafioSegundoFactor | None: ...

    @abstractmethod
    def eliminar_de_usuario(self, usuario_id: int) -> None: ...

    @abstractmethod
    def eliminar_expirados(self, momento: datetime) -> int: ...


class RepositorioAuditoria(ABC):
    @abstractmethod
    def registrar(self, evento: EventoAuditoria) -> EventoAuditoria:
        """Persiste el evento de inmediato, aunque la petición que lo originó termine en error."""

    @abstractmethod
    def listar(
        self, severidades: list[Severidad] | None = None, limite: int = 50, desplazamiento: int = 0
    ) -> list[EventoAuditoria]: ...


class RepositorioIntentosAcceso(ABC):
    """Registro de inicios de sesión fallidos para limitar la fuerza bruta."""

    @abstractmethod
    def reservar(self, nombre_usuario: str, ip: str) -> None:
        """Reserva en exclusiva el nombre de usuario (exista o no) y la IP hasta que termine la
        transacción, para que los intentos simultáneos no se cuelen entre la lectura y la
        escritura de los contadores. Si ya están reservados lanza `DemasiadasSolicitudes`."""

    @abstractmethod
    def esperar_usuario(self, nombre_usuario: str) -> None:
        """Toma la misma reserva del usuario que `reservar`, pero esperando a que termine el
        inicio de sesión en curso en lugar de rechazar. La usa el cambio de contraseña."""

    @abstractmethod
    def contar_fallos(self, nombre_usuario: str, ip: str, desde: datetime) -> ConteoFallos: ...

    @abstractmethod
    def registrar_fallo(self, nombre_usuario: str, ip: str, momento: datetime) -> None: ...

    @abstractmethod
    def limpiar(self, nombre_usuario: str, ip: str | None = None) -> None:
        """Borra los fallos del usuario (desde `ip`, o desde cualquier IP si se omite)."""

    @abstractmethod
    def eliminar_anteriores(self, momento: datetime) -> int: ...


class RepositorioSesiones(ABC):
    @abstractmethod
    def crear(self, sesion: Sesion) -> Sesion: ...

    @abstractmethod
    def obtener_por_hash_token(self, hash_token: str) -> Sesion | None: ...

    @abstractmethod
    def actualizar_actividad(self, sesion_id: int, momento: datetime) -> None: ...

    @abstractmethod
    def revocar(self, sesion_id: int) -> None: ...

    @abstractmethod
    def revocar_de_usuario(self, usuario_id: int) -> None: ...

    @abstractmethod
    def eliminar_expiradas(self, momento: datetime, inactivas_desde: datetime) -> int:
        """Borra las sesiones vencidas, revocadas o sin actividad desde `inactivas_desde`: ya no
        sirven y conservarlas solo acumula la IP y el navegador de cada usuario."""


class RepositorioPerfiles(ABC):
    @abstractmethod
    def obtener_por_id(self, perfil_id: int) -> PerfilDeteccion | None: ...

    @abstractmethod
    def obtener_por_nombre(self, nombre: str) -> PerfilDeteccion | None: ...

    @abstractmethod
    def obtener_predeterminado(self) -> PerfilDeteccion | None: ...

    @abstractmethod
    def listar(self) -> list[PerfilDeteccion]: ...

    @abstractmethod
    def guardar(self, perfil: PerfilDeteccion) -> PerfilDeteccion: ...

    @abstractmethod
    def eliminar(self, perfil_id: int) -> None: ...

    @abstractmethod
    def quitar_predeterminado(self, excepto_id: int | None = None) -> None: ...


class RepositorioAnalisis(ABC):
    @abstractmethod
    def guardar(self, registro: RegistroAnalisis) -> RegistroAnalisis: ...

    @abstractmethod
    def obtener_por_id(self, analisis_id: int) -> RegistroAnalisis | None: ...

    @abstractmethod
    def listar(
        self, usuario_id: int | None = None, limite: int = 50, desplazamiento: int = 0
    ) -> list[RegistroAnalisis]: ...


class UnidadDeTrabajo(ABC):
    """Permite a un servicio confirmar cambios aunque luego responda con error
    (p. ej., registrar un intento de inicio de sesión fallido)."""

    @abstractmethod
    def confirmar(self) -> None: ...
