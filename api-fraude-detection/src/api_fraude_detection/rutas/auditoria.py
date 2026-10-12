from typing import Annotated

from fastapi import APIRouter, Query

from ..contenedor import AdminActual, CtrlAuditoria
from ..vistas.auditoria import EventoPublico

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])


@router.get("", response_model=list[EventoPublico])
def listar_eventos(
    _: AdminActual,
    ctrl: CtrlAuditoria,
    solo_alertas: bool = False,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    """Registro de seguridad (más reciente primero). `solo_alertas`: advertencias y críticos."""
    return ctrl.listar(solo_alertas, limite, desplazamiento)
