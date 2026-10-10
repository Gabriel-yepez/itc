from collections.abc import Callable

from fastapi import Request

from .config import Settings
from .errores import PermisoDenegado

METODOS_SEGUROS = frozenset({"GET", "HEAD", "OPTIONS"})

CABECERAS_SEGURIDAD = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
}


def exigir_csrf_si_aplica(request: Request, config: Settings, validar: Callable[[str | None], bool]) -> None:
    """Patrón "double submit" ligado a la sesión: el token CSRF viaja en una cookie legible
    por el frontend y debe reenviarse en una cabecera; el servidor guarda solo su hash."""
    if request.method in METODOS_SEGUROS:
        return
    if not validar(request.headers.get(config.cabecera_csrf)):
        raise PermisoDenegado("Token CSRF ausente o inválido")
