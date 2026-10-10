from fastapi import APIRouter, status

from ..contenedor import AdminActual, CtrlUsuarios
from ..controladores.usuarios import SolicitudActualizarUsuario, SolicitudCrearUsuario
from ..vistas.usuarios import UsuarioPublico

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("", response_model=list[UsuarioPublico])
def listar_usuarios(_: AdminActual, ctrl: CtrlUsuarios):
    return ctrl.listar()


@router.post("", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
def crear_usuario(datos: SolicitudCrearUsuario, _: AdminActual, ctrl: CtrlUsuarios):
    return ctrl.crear(datos)


@router.patch("/{usuario_id}", response_model=UsuarioPublico)
def actualizar_usuario(
    usuario_id: int, datos: SolicitudActualizarUsuario, _: AdminActual, ctrl: CtrlUsuarios
):
    """Cambiar rol o desactivar un usuario revoca sus sesiones abiertas."""
    return ctrl.actualizar(usuario_id, datos)
