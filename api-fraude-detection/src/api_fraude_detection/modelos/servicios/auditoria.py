"""Registro de auditoría y alertas de seguridad.

Cada evento queda en `eventos_auditoria` (inmutable). Los de severidad "advertencia" o "critica"
además disparan una alerta: siempre en los logs (logger `api_fraude_detection.alertas`, que el
recolector de logs del servidor puede vigilar) y, si se configuró, en un webhook HTTPS.
"""

import json
import logging
import threading
import urllib.request
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from ..dominio.entidades import EventoAuditoria, Severidad, Usuario, ahora
from ..repositorios.interfaces import RepositorioAuditoria

log_alertas = logging.getLogger("api_fraude_detection.alertas")

# Severidades a partir de las cuales se avisa a alguien.
SEVERIDADES_CON_ALERTA = frozenset({Severidad.ADVERTENCIA, Severidad.CRITICA})


@dataclass(slots=True)
class ContextoAuditoria:
    """Quién y desde dónde, por petición. `actor` lo completa la autenticación."""

    ip: str | None = None
    actor: Usuario | None = None


class Notificador(ABC):
    @abstractmethod
    def notificar(self, evento: EventoAuditoria) -> None: ...


def _resumen(evento: EventoAuditoria) -> str:
    quien = evento.nombre_usuario or "anónimo"
    return f"[{evento.severidad.value.upper()}] {evento.tipo} · {quien} · IP {evento.ip or '—'}"


def _post_json(url: str, cuerpo: dict[str, Any], segundos: float) -> None:
    datos = json.dumps(cuerpo, ensure_ascii=False, default=str).encode()
    peticion = urllib.request.Request(
        url, data=datos, method="POST", headers={"Content-Type": "application/json"}
    )
    # Sin seguir redirecciones: el webhook no puede desviar las alertas a otro destino.
    abridor = urllib.request.build_opener(_SinRedirecciones())
    with abridor.open(peticion, timeout=segundos) as respuesta:
        respuesta.read(1024)


class _SinRedirecciones(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class NotificadorAlertas(Notificador):
    def __init__(
        self,
        webhook_url: str | None = None,
        segundos: float = 5,
        enviar: Callable[[str, dict[str, Any], float], None] = _post_json,
        en_segundo_plano: bool = True,
    ):
        self._url = webhook_url
        self._segundos = segundos
        self._enviar = enviar
        self._en_segundo_plano = en_segundo_plano

    def notificar(self, evento: EventoAuditoria) -> None:
        nivel = logging.CRITICAL if evento.severidad is Severidad.CRITICA else logging.WARNING
        cuerpo = {
            "text": _resumen(evento),
            "evento": {
                "id": evento.id,
                "momento": evento.momento.isoformat(),
                "tipo": evento.tipo,
                "severidad": evento.severidad.value,
                "usuario": evento.nombre_usuario,
                "ip": evento.ip,
                "detalle": evento.detalle,
            },
        }
        log_alertas.log(nivel, "ALERTA %s", json.dumps(cuerpo["evento"], ensure_ascii=False, default=str))
        if not self._url:
            return
        if self._en_segundo_plano:
            # La petición del usuario no espera al webhook (ni falla si este no responde).
            threading.Thread(target=self._entregar, args=(cuerpo,), daemon=True).start()
        else:
            self._entregar(cuerpo)

    def _entregar(self, cuerpo: dict[str, Any]) -> None:
        try:
            self._enviar(self._url, cuerpo, self._segundos)
        except Exception:
            log_alertas.exception("No se pudo entregar la alerta al webhook")


class ServicioAuditoria:
    def __init__(
        self,
        repositorio: RepositorioAuditoria,
        notificador: Notificador,
        contexto: ContextoAuditoria | None = None,
        reloj: Callable[[], datetime] = ahora,
    ):
        self._repositorio = repositorio
        self._notificador = notificador
        self._contexto = contexto or ContextoAuditoria()
        self._reloj = reloj

    def registrar(
        self,
        tipo: str,
        severidad: Severidad = Severidad.INFO,
        *,
        usuario: Usuario | None = None,
        nombre_usuario: str | None = None,
        **detalle: Any,
    ) -> EventoAuditoria:
        """`usuario`/`nombre_usuario`: a quién se refiere el evento. Si lo provoca otra persona
        con sesión (un administrador), ella queda como autora y el afectado va en el detalle."""
        actor = self._contexto.actor
        afectado = usuario.nombre_usuario if usuario else nombre_usuario
        if actor is not None and afectado and afectado != actor.nombre_usuario:
            detalle["usuario_afectado"] = afectado
        autor_id = actor.id if actor else (usuario.id if usuario else None)
        autor_nombre = actor.nombre_usuario if actor else afectado
        evento = self._repositorio.registrar(
            EventoAuditoria(
                tipo=tipo,
                severidad=severidad,
                momento=self._reloj(),
                usuario_id=autor_id,
                nombre_usuario=autor_nombre,
                ip=self._contexto.ip,
                detalle=detalle,
            )
        )
        if severidad in SEVERIDADES_CON_ALERTA:
            self._notificador.notificar(evento)
        return evento

    def listar(
        self, severidades: list[Severidad] | None, limite: int, desplazamiento: int
    ) -> list[EventoAuditoria]:
        return self._repositorio.listar(severidades, limite, desplazamiento)
