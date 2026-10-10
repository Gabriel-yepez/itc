from fastapi import APIRouter, status

from ..contenedor import AdminActual, CtrlPerfiles, UsuarioActual
from ..controladores.perfiles import SolicitudActualizarPerfil, SolicitudCrearPerfil
from ..modelos.dominio.parametros import ParametrosDeteccion
from ..vistas.perfiles import PerfilPublico

router = APIRouter(prefix="/perfiles", tags=["Perfiles de detección"])


@router.get("", response_model=list[PerfilPublico])
def listar_perfiles(_: UsuarioActual, ctrl: CtrlPerfiles):
    return ctrl.listar()


@router.get("/parametros/referencia", response_model=ParametrosDeteccion)
def parametros_referencia(_: UsuarioActual, ctrl: CtrlPerfiles):
    """Parámetros sugeridos para banca venezolana, útiles como plantilla de un perfil nuevo."""
    return ctrl.parametros_referencia()


@router.get("/parametros/esquema")
def esquema_parametros(_: UsuarioActual, ctrl: CtrlPerfiles) -> dict:
    """JSON Schema de los parámetros para generar formularios en el frontend."""
    return ctrl.esquema_parametros()


@router.get("/{perfil_id}", response_model=PerfilPublico)
def obtener_perfil(perfil_id: int, _: UsuarioActual, ctrl: CtrlPerfiles):
    return ctrl.obtener(perfil_id)


@router.post("", response_model=PerfilPublico, status_code=status.HTTP_201_CREATED)
def crear_perfil(datos: SolicitudCrearPerfil, admin: AdminActual, ctrl: CtrlPerfiles):
    return ctrl.crear(datos, admin)


@router.patch("/{perfil_id}", response_model=PerfilPublico)
def actualizar_perfil(perfil_id: int, datos: SolicitudActualizarPerfil, _: AdminActual, ctrl: CtrlPerfiles):
    return ctrl.actualizar(perfil_id, datos)


@router.delete("/{perfil_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_perfil(perfil_id: int, _: AdminActual, ctrl: CtrlPerfiles) -> None:
    ctrl.eliminar(perfil_id)
