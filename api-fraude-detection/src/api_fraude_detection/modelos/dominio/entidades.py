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
    # Contraseña asignada por otra persona (admin inicial, alta por un administrador): hasta
    # cambiarla solo puede consultar su sesión, cambiarla o salir.
    debe_cambiar_contrasena: bool = False
    # Doble factor (TOTP). `totp_secreto` en claro solo en memoria: en la base va cifrado.
    totp_secreto: str | None = None
    totp_activo: bool = False
    totp_ultimo_paso: int | None = None  # último código aceptado: impide reutilizarlo
    codigos_recuperacion: list[str] = field(default_factory=list)  # hashes SHA-256, de un solo uso
    creado_en: datetime = field(default_factory=ahora)
    id: int | None = None

    def debe_configurar_segundo_factor(self, exigido_a_admins: bool) -> bool:
        return exigido_a_admins and self.rol is Rol.ADMIN and not self.totp_activo


@dataclass(frozen=True, slots=True)
class ConteoFallos:
    """Inicios de sesión fallidos dentro de la ventana de bloqueo."""

    por_usuario_e_ip: int
    por_usuario: int
    por_ip: int


@dataclass(slots=True)
class DesafioSegundoFactor:
    """Contraseña ya validada, a la espera del código de doble factor."""

    usuario_id: int
    hash_token: str
    expira_en: datetime
    ip: str | None = None
    creado_en: datetime = field(default_factory=ahora)
    id: int | None = None


class Severidad(StrEnum):
    INFO = "info"
    ADVERTENCIA = "advertencia"  # genera alerta
    CRITICA = "critica"  # genera alerta


@dataclass(slots=True)
class EventoAuditoria:
    tipo: str
    severidad: Severidad
    momento: datetime = field(default_factory=ahora)
    usuario_id: int | None = None
    nombre_usuario: str | None = None
    ip: str | None = None
    detalle: dict[str, Any] = field(default_factory=dict)
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
