from fastapi import APIRouter, status

from ...dominio.parametros import ParametrosDeteccion
from ...esquemas.http import PerfilPublico, SolicitudActualizarPerfil, SolicitudCrearPerfil
from ...servicios.perfiles import parametros_referencia_venezuela
from ..dependencias import AdminActual, ServPerfiles, UsuarioActual

router = APIRouter(prefix="/perfiles", tags=["Perfiles de detección"])


@router.get("", response_model=list[PerfilPublico])
def listar_perfiles(_: UsuarioActual, perfiles: ServPerfiles) -> list[PerfilPublico]:
    return [PerfilPublico.desde(p) for p in perfiles.listar()]


@router.get("/parametros/referencia", response_model=ParametrosDeteccion)
def parametros_referencia(_: UsuarioActual) -> ParametrosDeteccion:
    """Parámetros sugeridos para banca venezolana, útiles como plantilla de un perfil nuevo."""
    return parametros_referencia_venezuela()


@router.get("/parametros/esquema")
def esquema_parametros(_: UsuarioActual) -> dict:
    """JSON Schema de los parámetros (descripciones, rangos y valores por defecto) para
    generar formularios en el frontend."""
    return ParametrosDeteccion.model_json_schema()


@router.get("/{perfil_id}", response_model=PerfilPublico)
def obtener_perfil(perfil_id: int, _: UsuarioActual, perfiles: ServPerfiles) -> PerfilPublico:
    return PerfilPublico.desde(perfiles.obtener(perfil_id))


@router.post("", response_model=PerfilPublico, status_code=status.HTTP_201_CREATED)
def crear_perfil(datos: SolicitudCrearPerfil, admin: AdminActual, perfiles: ServPerfiles) -> PerfilPublico:
    perfil = perfiles.crear(
        datos.nombre, datos.parametros, datos.descripcion, datos.predeterminado, admin.usuario.id
    )
    return PerfilPublico.desde(perfil)


@router.patch("/{perfil_id}", response_model=PerfilPublico)
def actualizar_perfil(
    perfil_id: int, datos: SolicitudActualizarPerfil, _: AdminActual, perfiles: ServPerfiles
) -> PerfilPublico:
    perfil = perfiles.actualizar(
        perfil_id,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        predeterminado=datos.predeterminado,
        cambios_parametros=datos.parametros,
    )
    return PerfilPublico.desde(perfil)


@router.delete("/{perfil_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_perfil(perfil_id: int, _: AdminActual, perfiles: ServPerfiles) -> None:
    perfiles.eliminar(perfil_id)
