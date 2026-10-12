"""Límites de carga: tamaño del cuerpo de las peticiones y trabajos pesados simultáneos."""

import threading
from collections import Counter
from collections.abc import Hashable, Iterator
from contextlib import contextmanager

from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .errores import DemasiadasSolicitudes

MB = 1024 * 1024
# A partir de este tamaño Starlette vuelca las subidas a disco (SpooledTemporaryFile).
UMBRAL_CUERPO_GRANDE = MB


class CuerpoDemasiadoGrande(HTTPException):
    def __init__(self, maximo_bytes: int):
        super().__init__(413, f"La petición supera el tamaño máximo permitido ({maximo_bytes // MB} MB)")


class LimiteCuerpo:
    """Middleware ASGI que corta las peticiones cuyo cuerpo supera el máximo.

    Sin él, Starlette lee el cuerpo completo (y vuelca las subidas a disco) antes de que la ruta
    pueda validarlo. Rechaza de entrada si Content-Length ya lo excede y, si el cliente lo omite
    o miente (envío por partes), corta en cuanto los bytes recibidos superan el límite.

    Además limita cuántos cuerpos grandes se reciben a la vez (429 si no hay cupo): el límite
    de tamaño por petición no impide llenar /tmp con muchas subidas simultáneas.
    """

    def __init__(
        self,
        app: ASGIApp,
        maximo_bytes: int,
        maximo_json_bytes: int,
        max_cuerpos_grandes_simultaneos: int,
    ):
        self.app = app
        self.maximo_bytes = maximo_bytes
        self.maximo_json_bytes = maximo_json_bytes
        self.max_cuerpos_grandes = max_cuerpos_grandes_simultaneos
        # El middleware corre en el bucle de eventos (un solo hilo): basta un contador.
        self.cuerpos_grandes_en_curso = 0

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        cabeceras = dict(scope["headers"])
        tipo = cabeceras.get(b"content-type", b"").split(b";")[0].strip().lower()
        maximo = self.maximo_json_bytes if tipo == b"application/json" else self.maximo_bytes

        declarado = cabeceras.get(b"content-length")
        if declarado is not None and (not declarado.isdigit() or int(declarado) > maximo):
            error = CuerpoDemasiadoGrande(maximo)
            await JSONResponse({"detail": error.detail}, status_code=error.status_code)(scope, receive, send)
            return

        # Sin Content-Length pero con cuerpo (envío por partes) el tamaño es desconocido: cuenta como grande.
        grande = (
            int(declarado) > UMBRAL_CUERPO_GRANDE
            if declarado is not None
            else b"transfer-encoding" in cabeceras
        )
        if not grande:
            await self._atender(scope, receive, send, maximo)
            return
        if self.cuerpos_grandes_en_curso >= self.max_cuerpos_grandes:
            await JSONResponse(
                {"detail": "El servidor está recibiendo otros archivos. Intente de nuevo en unos segundos."},
                status_code=429,
            )(scope, receive, send)
            return
        self.cuerpos_grandes_en_curso += 1
        try:
            await self._atender(scope, receive, send, maximo)
        finally:
            self.cuerpos_grandes_en_curso -= 1

    async def _atender(self, scope: Scope, receive: Receive, send: Send, maximo: int) -> None:
        recibidos = 0

        async def recibir_con_limite() -> Message:
            nonlocal recibidos
            mensaje = await receive()
            if mensaje["type"] == "http.request":
                recibidos += len(mensaje.get("body", b""))
                if recibidos > maximo:
                    # FastAPI deja pasar HTTPException al leer el cuerpo: el cliente recibe 413.
                    raise CuerpoDemasiadoGrande(maximo)
            return mensaje

        await self.app(scope, recibir_con_limite, send)


class LimitadorConcurrencia:
    """Cupos para trabajos que acaparan CPU y memoria (los análisis), por proceso.

    Un máximo global evita que el servidor se sature y otro por usuario evita que una sola
    cuenta ocupe todos los cupos. Si no hay cupo se rechaza al instante (429) en lugar de
    encolar: una cola retendría hilos y memoria justo cuando el servidor está saturado.
    """

    def __init__(self, maximo: int, maximo_por_clave: int):
        self._maximo = maximo
        self._maximo_por_clave = maximo_por_clave
        self._cerrojo = threading.Lock()
        self._en_curso = 0
        self._por_clave: Counter[Hashable] = Counter()

    @property
    def en_curso(self) -> int:
        return self._en_curso

    @contextmanager
    def reservar(self, clave: Hashable) -> Iterator[None]:
        with self._cerrojo:
            if self._por_clave[clave] >= self._maximo_por_clave:
                raise DemasiadasSolicitudes("Ya tiene un análisis en curso. Espere a que termine.")
            if self._en_curso >= self._maximo:
                raise DemasiadasSolicitudes(
                    "El servidor está procesando otros análisis. Intente de nuevo en unos segundos."
                )
            self._en_curso += 1
            self._por_clave[clave] += 1
        try:
            yield
        finally:
            with self._cerrojo:
                self._en_curso -= 1
                self._por_clave[clave] -= 1
                if not self._por_clave[clave]:
                    del self._por_clave[clave]
