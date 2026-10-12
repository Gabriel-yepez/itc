from ..modelos.dominio.entidades import Severidad
from ..modelos.servicios.auditoria import SEVERIDADES_CON_ALERTA, ServicioAuditoria
from ..vistas.auditoria import EventoPublico, VistaAuditoria


class ControladorAuditoria:
    def __init__(self, servicio: ServicioAuditoria, vista: VistaAuditoria):
        self._servicio = servicio
        self._vista = vista

    def listar(self, solo_alertas: bool, limite: int, desplazamiento: int) -> list[EventoPublico]:
        severidades: list[Severidad] | None = sorted(SEVERIDADES_CON_ALERTA) if solo_alertas else None
        return self._vista.lista(self._servicio.listar(severidades, limite, desplazamiento))
