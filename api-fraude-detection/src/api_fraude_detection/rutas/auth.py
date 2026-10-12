from fastapi import APIRouter, Request, Response, status

from ..contenedor import CtrlAuth, SesionActual
from ..controladores.auth import (
    SolicitudCambioContrasena,
    SolicitudConfigurarSegundoFactor,
    SolicitudDesactivarSegundoFactor,
    SolicitudLogin,
    SolicitudSegundoFactor,
)
from ..vistas.sesion import (
    CodigosRecuperacion,
    ConfiguracionSegundoFactorPublica,
    RespuestaInicio,
    RespuestaSesion,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=RespuestaInicio)
def iniciar_sesion(datos: SolicitudLogin, request: Request, response: Response, ctrl: CtrlAuth):
    """Valida credenciales y emite la cookie de sesión (HttpOnly) y la cookie CSRF. Si la cuenta
    tiene doble factor responde `segundo_factor_requerido` y falta POST /auth/segundo-factor."""
    return ctrl.iniciar_sesion(datos, request, response)


@router.post("/segundo-factor", response_model=RespuestaInicio)
def verificar_segundo_factor(
    datos: SolicitudSegundoFactor, request: Request, response: Response, ctrl: CtrlAuth
):
    """Segundo paso del login: código de la app de autenticación o un código de recuperación."""
    return ctrl.verificar_segundo_factor(datos, request, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(actual: SesionActual, response: Response, ctrl: CtrlAuth) -> None:
    ctrl.cerrar_sesion(actual, response)


@router.get("/sesion", response_model=RespuestaSesion)
def sesion_actual(actual: SesionActual, ctrl: CtrlAuth):
    return ctrl.sesion_actual(actual)


@router.post("/cambiar-contrasena", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_contrasena(
    datos: SolicitudCambioContrasena, actual: SesionActual, response: Response, ctrl: CtrlAuth
) -> None:
    """Cambia la contraseña y cierra todas las sesiones del usuario (incluida la actual)."""
    ctrl.cambiar_contrasena(datos, actual, response)


@router.post("/segundo-factor/configurar", response_model=ConfiguracionSegundoFactorPublica)
def configurar_segundo_factor(
    datos: SolicitudConfigurarSegundoFactor, actual: SesionActual, request: Request, ctrl: CtrlAuth
):
    """Genera el secreto y el código QR. Queda pendiente hasta confirmarlo con /activar."""
    return ctrl.configurar_segundo_factor(datos, actual, request)


@router.post("/segundo-factor/activar", response_model=CodigosRecuperacion)
def activar_segundo_factor(
    datos: SolicitudSegundoFactor, actual: SesionActual, response: Response, ctrl: CtrlAuth
):
    """Confirma con un código de la app, devuelve los códigos de recuperación (única vez) y cierra
    todas las sesiones: se vuelve a ingresar ya con doble factor."""
    return ctrl.activar_segundo_factor(datos, actual, response)


@router.post("/segundo-factor/desactivar", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_segundo_factor(
    datos: SolicitudDesactivarSegundoFactor, actual: SesionActual, response: Response, ctrl: CtrlAuth
) -> None:
    """Solo analistas: para los administradores es obligatorio."""
    ctrl.desactivar_segundo_factor(datos, actual, response)
