from fastapi import APIRouter, Request, Response, status

from ...esquemas.http import (
    RespuestaSesion,
    SolicitudCambioContrasena,
    SolicitudLogin,
    UsuarioPublico,
)
from ..dependencias import Config, ServAuth, UsuarioActual
from ..seguridad_http import borrar_cookies_sesion, establecer_cookies_sesion

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=RespuestaSesion)
def iniciar_sesion(
    datos: SolicitudLogin, request: Request, response: Response, config: Config, auth: ServAuth
) -> RespuestaSesion:
    """Valida credenciales y emite la cookie de sesión (HttpOnly) y la cookie CSRF."""
    sesion = auth.iniciar_sesion(
        datos.usuario,
        datos.contrasena,
        ip=request.client.host if request.client else None,
        agente_usuario=request.headers.get("user-agent"),
    )
    establecer_cookies_sesion(response, config, sesion.token_sesion, sesion.token_csrf, sesion.expira_en)
    return RespuestaSesion(
        usuario=UsuarioPublico.desde(sesion.usuario),
        expira_en=sesion.expira_en,
        csrf_token=sesion.token_csrf,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(actual: UsuarioActual, response: Response, config: Config, auth: ServAuth) -> None:
    auth.cerrar_sesion(actual.sesion)
    borrar_cookies_sesion(response, config)


@router.get("/sesion", response_model=RespuestaSesion)
def sesion_actual(actual: UsuarioActual) -> RespuestaSesion:
    return RespuestaSesion(usuario=UsuarioPublico.desde(actual.usuario), expira_en=actual.sesion.expira_en)


@router.post("/cambiar-contrasena", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_contrasena(
    datos: SolicitudCambioContrasena,
    actual: UsuarioActual,
    response: Response,
    config: Config,
    auth: ServAuth,
) -> None:
    """Cambia la contraseña y cierra todas las sesiones del usuario (incluida la actual)."""
    auth.cambiar_contrasena(actual.usuario, datos.contrasena_actual, datos.contrasena_nueva)
    borrar_cookies_sesion(response, config)
