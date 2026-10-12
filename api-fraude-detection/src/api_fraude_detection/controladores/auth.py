from fastapi import Request, Response
from pydantic import Field

from ..core.config import Settings
from ..modelos.servicios.autenticacion import ServicioAutenticacion, UsuarioAutenticado
from ..vistas.sesion import (
    CodigosRecuperacion,
    ConfiguracionSegundoFactorPublica,
    RespuestaInicio,
    RespuestaSesion,
    VistaSesion,
)
from .base import Solicitud
from .usuarios import CONTRASENA

# Código TOTP (6 dígitos) o de recuperación ("abcde-fghjk").
CODIGO = Field(min_length=6, max_length=20)


class SolicitudLogin(Solicitud):
    usuario: str = Field(min_length=1, max_length=64)
    contrasena: str = Field(min_length=1, max_length=128)


class SolicitudSegundoFactor(Solicitud):
    codigo: str = CODIGO


class SolicitudCambioContrasena(Solicitud):
    contrasena_actual: str = Field(min_length=1, max_length=128)
    contrasena_nueva: str = CONTRASENA


class SolicitudConfigurarSegundoFactor(Solicitud):
    contrasena: str = Field(min_length=1, max_length=128)


class SolicitudDesactivarSegundoFactor(Solicitud):
    contrasena: str = Field(min_length=1, max_length=128)
    codigo: str = CODIGO


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


class ControladorAuth:
    def __init__(self, servicio: ServicioAutenticacion, vista: VistaSesion, config: Settings):
        self._servicio = servicio
        self._vista = vista
        self._config = config

    def iniciar_sesion(
        self, solicitud: SolicitudLogin, request: Request, response: Response
    ) -> RespuestaInicio:
        resultado = self._servicio.iniciar_sesion(
            solicitud.usuario,
            solicitud.contrasena,
            ip=_ip(request),
            agente_usuario=request.headers.get("user-agent"),
        )
        return self._vista.inicio(response, resultado)

    def verificar_segundo_factor(
        self, solicitud: SolicitudSegundoFactor, request: Request, response: Response
    ) -> RespuestaInicio:
        sesion = self._servicio.verificar_segundo_factor(
            request.cookies.get(self._config.cookie_desafio_nombre),
            solicitud.codigo,
            ip=_ip(request),
            agente_usuario=request.headers.get("user-agent"),
        )
        return self._vista.sesion_iniciada(response, sesion)

    def cerrar_sesion(self, actual: UsuarioAutenticado, response: Response) -> None:
        self._servicio.cerrar_sesion(actual)
        self._vista.sesion_cerrada(response)

    def sesion_actual(self, actual: UsuarioAutenticado) -> RespuestaSesion:
        return self._vista.sesion_actual(actual)

    def cambiar_contrasena(
        self, solicitud: SolicitudCambioContrasena, actual: UsuarioAutenticado, response: Response
    ) -> None:
        self._servicio.cambiar_contrasena(
            actual.usuario, solicitud.contrasena_actual, solicitud.contrasena_nueva
        )
        self._vista.sesion_cerrada(response)

    def configurar_segundo_factor(
        self, solicitud: SolicitudConfigurarSegundoFactor, actual: UsuarioAutenticado, request: Request
    ) -> ConfiguracionSegundoFactorPublica:
        configuracion = self._servicio.iniciar_configuracion_segundo_factor(
            actual.usuario, solicitud.contrasena, _ip(request)
        )
        return self._vista.configuracion_segundo_factor(configuracion)

    def activar_segundo_factor(
        self, solicitud: SolicitudSegundoFactor, actual: UsuarioAutenticado, response: Response
    ) -> CodigosRecuperacion:
        codigos = self._servicio.activar_segundo_factor(actual.usuario, solicitud.codigo)
        self._vista.sesion_cerrada(response)
        return CodigosRecuperacion(codigos_recuperacion=codigos)

    def desactivar_segundo_factor(
        self, solicitud: SolicitudDesactivarSegundoFactor, actual: UsuarioAutenticado, response: Response
    ) -> None:
        self._servicio.desactivar_segundo_factor(actual.usuario, solicitud.contrasena, solicitud.codigo)
        self._vista.sesion_cerrada(response)
