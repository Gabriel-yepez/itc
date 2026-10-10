from fastapi import Request, Response
from pydantic import Field

from ..modelos.servicios.autenticacion import ServicioAutenticacion, UsuarioAutenticado
from ..vistas.sesion import RespuestaSesion, VistaSesion
from .base import Solicitud
from .usuarios import CONTRASENA


class SolicitudLogin(Solicitud):
    usuario: str = Field(min_length=1, max_length=64)
    contrasena: str = Field(min_length=1, max_length=128)


class SolicitudCambioContrasena(Solicitud):
    contrasena_actual: str = Field(min_length=1, max_length=128)
    contrasena_nueva: str = CONTRASENA


class ControladorAuth:
    def __init__(self, servicio: ServicioAutenticacion, vista: VistaSesion):
        self._servicio = servicio
        self._vista = vista

    def iniciar_sesion(
        self, solicitud: SolicitudLogin, request: Request, response: Response
    ) -> RespuestaSesion:
        sesion = self._servicio.iniciar_sesion(
            solicitud.usuario,
            solicitud.contrasena,
            ip=request.client.host if request.client else None,
            agente_usuario=request.headers.get("user-agent"),
        )
        return self._vista.sesion_iniciada(response, sesion)

    def cerrar_sesion(self, actual: UsuarioAutenticado, response: Response) -> None:
        self._servicio.cerrar_sesion(actual.sesion)
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
