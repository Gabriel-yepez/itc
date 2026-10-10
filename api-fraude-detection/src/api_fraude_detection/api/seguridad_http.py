from collections.abc import Callable
from datetime import datetime

from fastapi import Request, Response

from ..core.config import Settings
from ..core.errores import PermisoDenegado

METODOS_SEGUROS = frozenset({"GET", "HEAD", "OPTIONS"})


def exigir_csrf_si_aplica(request: Request, config: Settings, validar: Callable[[str | None], bool]) -> None:
    """Patrón "double submit" ligado a la sesión: el token CSRF viaja en una cookie legible
    por el frontend y debe reenviarse en una cabecera; el servidor guarda solo su hash."""
    if request.method in METODOS_SEGUROS:
        return
    if not validar(request.headers.get(config.cabecera_csrf)):
        raise PermisoDenegado("Token CSRF ausente o inválido")


def _opciones_cookie(config: Settings) -> dict:
    return {
        "secure": config.cookie_segura,
        "samesite": config.cookie_samesite,
        "domain": config.cookie_dominio,
        "path": "/",
    }


def establecer_cookies_sesion(
    respuesta: Response, config: Settings, token_sesion: str, token_csrf: str, expira_en: datetime
) -> None:
    opciones = _opciones_cookie(config)
    duracion = config.sesion_horas_absolutas * 3600
    # HttpOnly: JavaScript no puede leer el token de sesión (mitiga robo por XSS).
    respuesta.set_cookie(
        config.cookie_sesion_nombre,
        token_sesion,
        max_age=duracion,
        expires=expira_en,
        httponly=True,
        **opciones,
    )
    # La cookie CSRF debe ser legible por el frontend para copiarla a la cabecera.
    respuesta.set_cookie(
        config.cookie_csrf_nombre,
        token_csrf,
        max_age=duracion,
        expires=expira_en,
        httponly=False,
        **opciones,
    )


def borrar_cookies_sesion(respuesta: Response, config: Settings) -> None:
    opciones = _opciones_cookie(config)
    respuesta.delete_cookie(config.cookie_sesion_nombre, httponly=True, **opciones)
    respuesta.delete_cookie(config.cookie_csrf_nombre, httponly=False, **opciones)


CABECERAS_SEGURIDAD = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
}
