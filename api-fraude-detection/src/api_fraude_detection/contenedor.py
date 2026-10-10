"""Contenedor de inyección de dependencias: el único lugar donde se decide qué
implementación concreta recibe cada pieza.

    BD ─► repositorios ─► servicios ─┐            (Modelo)
                                     ├─► controladores ◄── rutas
                      vistas ────────┘            (Vista / Controlador)

Cualquier eslabón (repositorio, detector, vista...) puede sustituirse con
`app.dependency_overrides[proveedor] = otro` sin tocar el resto.
"""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from .controladores.analisis import ControladorAnalisis
from .controladores.auth import ControladorAuth
from .controladores.perfiles import ControladorPerfiles
from .controladores.usuarios import ControladorUsuarios
from .core.config import Settings
from .core.errores import PermisoDenegado
from .core.seguridad_http import exigir_csrf_si_aplica
from .modelos.dominio.detector import DetectorBenford, DetectorFraude
from .modelos.persistencia.base import sesion_por_peticion
from .modelos.repositorios.interfaces import (
    RepositorioAnalisis,
    RepositorioPerfiles,
    RepositorioSesiones,
    RepositorioUsuarios,
    UnidadDeTrabajo,
)
from .modelos.repositorios.sql import (
    RepositorioAnalisisSQL,
    RepositorioPerfilesSQL,
    RepositorioSesionesSQL,
    RepositorioUsuariosSQL,
    UnidadDeTrabajoSQL,
)
from .modelos.servicios.analisis import ServicioAnalisis
from .modelos.servicios.autenticacion import ServicioAutenticacion, UsuarioAutenticado
from .modelos.servicios.perfiles import ServicioPerfiles
from .vistas.analisis import VistaAnalisis
from .vistas.perfiles import VistaPerfiles
from .vistas.sesion import VistaSesion
from .vistas.usuarios import VistaUsuarios

# ------------------------------------------------------------------ infraestructura


def obtener_config(request: Request) -> Settings:
    return request.app.state.settings


def obtener_db(request: Request) -> Iterator[Session]:
    yield from sesion_por_peticion(request.app.state.fabrica_sesiones)


Config = Annotated[Settings, Depends(obtener_config)]
Db = Annotated[Session, Depends(obtener_db)]

# ------------------------------------------------------------------ Modelo: repositorios


def repo_usuarios(db: Db) -> RepositorioUsuarios:
    return RepositorioUsuariosSQL(db)


def repo_sesiones(db: Db) -> RepositorioSesiones:
    return RepositorioSesionesSQL(db)


def repo_perfiles(db: Db) -> RepositorioPerfiles:
    return RepositorioPerfilesSQL(db)


def repo_analisis(db: Db) -> RepositorioAnalisis:
    return RepositorioAnalisisSQL(db)


def unidad_trabajo(db: Db) -> UnidadDeTrabajo:
    return UnidadDeTrabajoSQL(db)


def detector_fraude() -> DetectorFraude:
    return DetectorBenford()


# ------------------------------------------------------------------ Modelo: servicios


def servicio_autenticacion(
    config: Config,
    usuarios: Annotated[RepositorioUsuarios, Depends(repo_usuarios)],
    sesiones: Annotated[RepositorioSesiones, Depends(repo_sesiones)],
    uow: Annotated[UnidadDeTrabajo, Depends(unidad_trabajo)],
) -> ServicioAutenticacion:
    return ServicioAutenticacion(usuarios, sesiones, uow, config)


def servicio_perfiles(
    perfiles: Annotated[RepositorioPerfiles, Depends(repo_perfiles)],
) -> ServicioPerfiles:
    return ServicioPerfiles(perfiles)


def servicio_analisis(
    config: Config,
    detector: Annotated[DetectorFraude, Depends(detector_fraude)],
    perfiles: Annotated[ServicioPerfiles, Depends(servicio_perfiles)],
    analisis: Annotated[RepositorioAnalisis, Depends(repo_analisis)],
) -> ServicioAnalisis:
    return ServicioAnalisis(detector, perfiles, analisis, config.max_transacciones)


ServAuth = Annotated[ServicioAutenticacion, Depends(servicio_autenticacion)]

# ------------------------------------------------------------------ Vistas


def vista_usuarios() -> VistaUsuarios:
    return VistaUsuarios()


def vista_sesion(config: Config, usuarios: Annotated[VistaUsuarios, Depends(vista_usuarios)]) -> VistaSesion:
    return VistaSesion(config, usuarios)


def vista_perfiles() -> VistaPerfiles:
    return VistaPerfiles()


def vista_analisis() -> VistaAnalisis:
    return VistaAnalisis()


# ------------------------------------------------------------------ Controladores


def controlador_auth(
    servicio: ServAuth, vista: Annotated[VistaSesion, Depends(vista_sesion)]
) -> ControladorAuth:
    return ControladorAuth(servicio, vista)


def controlador_usuarios(
    servicio: ServAuth, vista: Annotated[VistaUsuarios, Depends(vista_usuarios)]
) -> ControladorUsuarios:
    return ControladorUsuarios(servicio, vista)


def controlador_perfiles(
    servicio: Annotated[ServicioPerfiles, Depends(servicio_perfiles)],
    vista: Annotated[VistaPerfiles, Depends(vista_perfiles)],
) -> ControladorPerfiles:
    return ControladorPerfiles(servicio, vista)


def controlador_analisis(
    config: Config,
    servicio: Annotated[ServicioAnalisis, Depends(servicio_analisis)],
    vista: Annotated[VistaAnalisis, Depends(vista_analisis)],
) -> ControladorAnalisis:
    return ControladorAnalisis(servicio, vista, config.max_tamano_csv_mb, config.max_transacciones)


CtrlAuth = Annotated[ControladorAuth, Depends(controlador_auth)]
CtrlUsuarios = Annotated[ControladorUsuarios, Depends(controlador_usuarios)]
CtrlPerfiles = Annotated[ControladorPerfiles, Depends(controlador_perfiles)]
CtrlAnalisis = Annotated[ControladorAnalisis, Depends(controlador_analisis)]

# ------------------------------------------------------------------ autenticación / autorización


def usuario_actual(request: Request, config: Config, auth: ServAuth) -> UsuarioAutenticado:
    """Valida la cookie de sesión y, en métodos que modifican datos, el token CSRF."""
    actual = auth.autenticar(request.cookies.get(config.cookie_sesion_nombre))
    exigir_csrf_si_aplica(request, config, lambda token: auth.csrf_valido(actual.sesion, token))
    return actual


def admin_actual(
    actual: Annotated[UsuarioAutenticado, Depends(usuario_actual)],
) -> UsuarioAutenticado:
    if not actual.es_admin:
        raise PermisoDenegado("Se requiere rol de administrador")
    return actual


UsuarioActual = Annotated[UsuarioAutenticado, Depends(usuario_actual)]
AdminActual = Annotated[UsuarioAutenticado, Depends(admin_actual)]
