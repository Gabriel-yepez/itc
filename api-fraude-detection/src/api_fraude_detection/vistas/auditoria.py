from datetime import datetime
from typing import Any

from pydantic import BaseModel

from ..modelos.dominio.entidades import EventoAuditoria, Severidad


class EventoPublico(BaseModel):
    id: int
    momento: datetime
    tipo: str
    severidad: Severidad
    nombre_usuario: str | None
    ip: str | None
    detalle: dict[str, Any]


class VistaAuditoria:
    def lista(self, eventos: list[EventoAuditoria]) -> list[EventoPublico]:
        return [
            EventoPublico(
                id=e.id,
                momento=e.momento,
                tipo=e.tipo,
                severidad=e.severidad,
                nombre_usuario=e.nombre_usuario,
                ip=e.ip,
                detalle=e.detalle,
            )
            for e in eventos
        ]
