from fastapi import APIRouter, Request, Response, status

from ..contenedor import CtrlAuth, UsuarioActual
from ..controladores.auth import SolicitudCambioContrasena, SolicitudLogin
from ..vistas.sesion import RespuestaSesion

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=RespuestaSesion)
def iniciar_sesion(datos: SolicitudLogin, request: Request, response: Response, ctrl: CtrlAuth):
    """Valida credenciales y emite la cookie de sesión (HttpOnly) y la cookie CSRF."""
    return ctrl.iniciar_sesion(datos, request, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(actual: UsuarioActual, response: Response, ctrl: CtrlAuth) -> None:
    ctrl.cerrar_sesion(actual, response)


@router.get("/sesion", response_model=RespuestaSesion)
def sesion_actual(actual: UsuarioActual, ctrl: CtrlAuth):
    return ctrl.sesion_actual(actual)


@router.post("/cambiar-contrasena", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_contrasena(
    datos: SolicitudCambioContrasena, actual: UsuarioActual, response: Response, ctrl: CtrlAuth
) -> None:
    """Cambia la contraseña y cierra todas las sesiones del usuario (incluida la actual)."""
    ctrl.cambiar_contrasena(datos, actual, response)
