from fastapi import APIRouter, status

from ...esquemas.http import SolicitudActualizarUsuario, SolicitudCrearUsuario, UsuarioPublico
from ..dependencias import AdminActual, ServAuth

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=list[UsuarioPublico])
def listar_usuarios(_: AdminActual, auth: ServAuth) -> list[UsuarioPublico]:
    return [UsuarioPublico.desde(u) for u in auth.listar_usuarios()]


@router.post("", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
def crear_usuario(datos: SolicitudCrearUsuario, _: AdminActual, auth: ServAuth) -> UsuarioPublico:
    return UsuarioPublico.desde(auth.crear_usuario(datos.nombre_usuario, datos.contrasena, datos.rol))


@router.patch("/{usuario_id}", response_model=UsuarioPublico)
def actualizar_usuario(
    usuario_id: int, datos: SolicitudActualizarUsuario, _: AdminActual, auth: ServAuth
) -> UsuarioPublico:
    """Cambiar rol o desactivar un usuario revoca sus sesiones abiertas."""
    return UsuarioPublico.desde(auth.actualizar_usuario(usuario_id, datos.rol, datos.activo))
