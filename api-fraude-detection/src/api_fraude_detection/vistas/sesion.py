from datetime import datetime

import segno
from fastapi import Response
from pydantic import BaseModel, Field

from ..core.config import Settings
from ..modelos.servicios.autenticacion import (
    ConfiguracionSegundoFactor,
    ResultadoInicio,
    SesionIniciada,
    UsuarioAutenticado,
)
from .usuarios import UsuarioPublico, VistaUsuarios


class RespuestaSesion(BaseModel):
    usuario: UsuarioPublico
    expira_en: datetime
    csrf_token: str | None = Field(
        default=None, description="Enviar en la cabecera X-CSRF-Token en peticiones que modifican datos"
    )


class RespuestaInicio(BaseModel):
    """Respuesta del login: la sesión abierta, o el aviso de que falta el código de doble factor
    (en ese caso `usuario` no viene y el intento se identifica con una cookie HttpOnly)."""

    segundo_factor_requerido: bool = False
    usuario: UsuarioPublico | None = None
    expira_en: datetime | None = None
    csrf_token: str | None = None


class ConfiguracionSegundoFactorPublica(BaseModel):
    secreto: str = Field(description="Para escribirlo a mano si no se puede leer el código QR")
    uri: str = Field(description="otpauth:// que codifica el QR")
    qr: str = Field(description="Código QR como imagen SVG (data URI)")


class CodigosRecuperacion(BaseModel):
    codigos_recuperacion: list[str] = Field(description="Se muestran solo esta vez; cada uno sirve una vez")


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

    def inicio(self, respuesta: Response, resultado: ResultadoInicio) -> RespuestaInicio:
        if resultado.sesion is not None:
            return self.sesion_iniciada(respuesta, resultado.sesion)
        # HttpOnly y de corta vida: solo vale para enviar el código de este intento.
        respuesta.set_cookie(
            self._config.cookie_desafio_nombre,
            resultado.token_desafio,
            max_age=self._config.minutos_desafio_segundo_factor * 60,
            httponly=True,
            **self._opciones_cookie(),
        )
        return RespuestaInicio(segundo_factor_requerido=True, expira_en=resultado.desafio_expira_en)

    def sesion_iniciada(self, respuesta: Response, sesion: SesionIniciada) -> RespuestaInicio:
        opciones = self._opciones_cookie()
        respuesta.delete_cookie(self._config.cookie_desafio_nombre, httponly=True, **opciones)
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
        return RespuestaInicio(
            usuario=self._usuarios.detalle(sesion.usuario),
            expira_en=sesion.expira_en,
            csrf_token=sesion.token_csrf,
        )

    @staticmethod
    def configuracion_segundo_factor(config: ConfiguracionSegundoFactor) -> ConfiguracionSegundoFactorPublica:
        qr = segno.make(config.uri, error="m").svg_data_uri(scale=5, border=2)
        return ConfiguracionSegundoFactorPublica(secreto=config.secreto, uri=config.uri, qr=qr)

    def sesion_actual(self, actual: UsuarioAutenticado) -> RespuestaSesion:
        return RespuestaSesion(
            usuario=self._usuarios.detalle(actual.usuario), expira_en=actual.sesion.expira_en
        )

    def sesion_cerrada(self, respuesta: Response) -> None:
        opciones = self._opciones_cookie()
        respuesta.delete_cookie(self._config.cookie_sesion_nombre, httponly=True, **opciones)
        respuesta.delete_cookie(self._config.cookie_csrf_nombre, httponly=False, **opciones)
