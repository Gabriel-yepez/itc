from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from .parametros import NivelRiesgo, ParametrosDeteccion


def ahora() -> datetime:
    return datetime.now(UTC)


class Rol(StrEnum):
    ADMIN = "admin"  # gestiona usuarios y perfiles de detección
    ANALISTA = "analista"  # ejecuta y consulta análisis


@dataclass(slots=True)
class Usuario:
    nombre_usuario: str
    hash_contrasena: str
    rol: Rol = Rol.ANALISTA
    activo: bool = True
    intentos_fallidos: int = 0
    bloqueado_hasta: datetime | None = None
    creado_en: datetime = field(default_factory=ahora)
    id: int | None = None


@dataclass(slots=True)
class Sesion:
    usuario_id: int
    hash_token: str
    hash_csrf: str
    expira_en: datetime
    ultima_actividad: datetime = field(default_factory=ahora)
    creada_en: datetime = field(default_factory=ahora)
    ip: str | None = None
    agente_usuario: str | None = None
    revocada: bool = False
    id: int | None = None


@dataclass(slots=True)
class PerfilDeteccion:
    nombre: str
    parametros: ParametrosDeteccion
    descripcion: str = ""
    predeterminado: bool = False
    creado_por: int | None = None
    creado_en: datetime = field(default_factory=ahora)
    actualizado_en: datetime = field(default_factory=ahora)
    id: int | None = None


@dataclass(slots=True)
class RegistroAnalisis:
    usuario_id: int
    parametros: dict[str, Any]
    resultado: dict[str, Any]
    puntaje: float
    nivel_riesgo: NivelRiesgo
    total_transacciones: int
    perfil_id: int | None = None
    descripcion: str = ""
    creado_en: datetime = field(default_factory=ahora)
    id: int | None = None
