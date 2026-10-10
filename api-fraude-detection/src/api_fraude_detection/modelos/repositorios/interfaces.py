"""Contratos de persistencia. Los servicios dependen solo de estas abstracciones;
la implementación concreta (SQLAlchemy, memoria, ...) se inyecta en `api/dependencias.py`.
"""

from abc import ABC, abstractmethod
from datetime import datetime

from ..dominio.entidades import PerfilDeteccion, RegistroAnalisis, Sesion, Usuario


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
    def guardar(self, usuario: Usuario) -> Usuario:
        """Crea el usuario si no tiene id; si lo tiene, lo actualiza."""


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
    def eliminar_expiradas(self, momento: datetime) -> int: ...


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
