from datetime import datetime

from fastapi import Response
from pydantic import BaseModel, Field

from ..core.config import Settings
from ..modelos.servicios.autenticacion import SesionIniciada, UsuarioAutenticado
from .usuarios import UsuarioPublico, VistaUsuarios


class RespuestaSesion(BaseModel):
    usuario: UsuarioPublico
    expira_en: datetime
    csrf_token: str | None = Field(
        default=None, description="Enviar en la cabecera X-CSRF-Token en peticiones que modifican datos"
    )


class VistaSesion:
    """Presenta la sesión al cliente: cuerpo JSON y cookies."""

    def __init__(self, config: Settings, usuarios: VistaUsuarios):
        self._config = config
        self._usuarios = usuarios

    def _opciones_cookie(self) -> dict:
        return {
            "secure": self._config.cookie_segura,
            "samesite": self._config.cookie_samesite,
            "domain": self._config.cookie_dominio,
            "path": "/",
        }

    def sesion_iniciada(self, respuesta: Response, sesion: SesionIniciada) -> RespuestaSesion:
        opciones = self._opciones_cookie()
        duracion = self._config.sesion_horas_absolutas * 3600
        # HttpOnly: JavaScript no puede leer el token de sesión (mitiga robo por XSS).
        respuesta.set_cookie(
            self._config.cookie_sesion_nombre,
            sesion.token_sesion,
            max_age=duracion,
            expires=sesion.expira_en,
            httponly=True,
            **opciones,
        )
        # La cookie CSRF debe ser legible por el frontend para copiarla a la cabecera.
        respuesta.set_cookie(
            self._config.cookie_csrf_nombre,
            sesion.token_csrf,
            max_age=duracion,
            expires=sesion.expira_en,
            httponly=False,
            **opciones,
        )
        return RespuestaSesion(
            usuario=self._usuarios.detalle(sesion.usuario),
            expira_en=sesion.expira_en,
            csrf_token=sesion.token_csrf,
        )

    def sesion_actual(self, actual: UsuarioAutenticado) -> RespuestaSesion:
        return RespuestaSesion(
            usuario=self._usuarios.detalle(actual.usuario), expira_en=actual.sesion.expira_en
        )

    def sesion_cerrada(self, respuesta: Response) -> None:
        opciones = self._opciones_cookie()
        respuesta.delete_cookie(self._config.cookie_sesion_nombre, httponly=True, **opciones)
        respuesta.delete_cookie(self._config.cookie_csrf_nombre, httponly=False, **opciones)
