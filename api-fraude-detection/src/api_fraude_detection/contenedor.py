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
from .controladores.auditoria import ControladorAuditoria
from .controladores.auth import ControladorAuth
from .controladores.perfiles import ControladorPerfiles
from .controladores.usuarios import ControladorUsuarios
from .core.cifrado import Cifrador
from .core.config import Settings
from .core.errores import PermisoDenegado
from .core.limites import LimitadorConcurrencia
from .core.seguridad_http import exigir_csrf_si_aplica
from .modelos.dominio.detector import DetectorBenford, DetectorFraude
from .modelos.dominio.entidades import Severidad
from .modelos.persistencia.base import sesion_por_peticion
from .modelos.repositorios.interfaces import (
    RepositorioAnalisis,
    RepositorioAuditoria,
    RepositorioDesafios,
    RepositorioIntentosAcceso,
    RepositorioPerfiles,
    RepositorioSesiones,
    RepositorioUsuarios,
    UnidadDeTrabajo,
)
from .modelos.repositorios.sql import (
    RepositorioAnalisisSQL,
    RepositorioAuditoriaSQL,
    RepositorioDesafiosSQL,
    RepositorioIntentosAccesoSQL,
    RepositorioPerfilesSQL,
    RepositorioSesionesSQL,
    RepositorioUsuariosSQL,
    UnidadDeTrabajoSQL,
)
from .modelos.servicios.analisis import ServicioAnalisis
from .modelos.servicios.auditoria import ContextoAuditoria, Notificador, ServicioAuditoria
from .modelos.servicios.autenticacion import ServicioAutenticacion, UsuarioAutenticado
from .modelos.servicios.perfiles import ServicioPerfiles
from .vistas.analisis import VistaAnalisis
from .vistas.auditoria import VistaAuditoria
from .vistas.perfiles import VistaPerfiles
from .vistas.sesion import VistaSesion
from .vistas.usuarios import VistaUsuarios

# ------------------------------------------------------------------ infraestructura


def obtener_config(request: Request) -> Settings:
    return request.app.state.settings


def limitador_analisis(request: Request) -> LimitadorConcurrencia:
    return request.app.state.limitador_analisis


def obtener_cifrador(request: Request) -> Cifrador:
    return request.app.state.cifrador


def notificador_alertas(request: Request) -> Notificador:
    return request.app.state.notificador_alertas


def contexto_auditoria(request: Request) -> ContextoAuditoria:
    """Uno por petición (FastAPI lo reutiliza en toda la cadena): la autenticación le añade el actor."""
    return ContextoAuditoria(ip=request.client.host if request.client else None)


def obtener_db(request: Request) -> Iterator[Session]:
    yield from sesion_por_peticion(request.app.state.fabrica_sesiones)


Config = Annotated[Settings, Depends(obtener_config)]
Db = Annotated[Session, Depends(obtener_db)]
CifradorDep = Annotated[Cifrador, Depends(obtener_cifrador)]
Contexto = Annotated[ContextoAuditoria, Depends(contexto_auditoria)]

# ------------------------------------------------------------------ Modelo: repositorios


def repo_usuarios(db: Db, cifrador: CifradorDep) -> RepositorioUsuarios:
    return RepositorioUsuariosSQL(db, cifrador)


def repo_sesiones(db: Db) -> RepositorioSesiones:
    return RepositorioSesionesSQL(db)


def repo_intentos_acceso(db: Db) -> RepositorioIntentosAcceso:
    return RepositorioIntentosAccesoSQL(db)


def repo_perfiles(db: Db) -> RepositorioPerfiles:
    return RepositorioPerfilesSQL(db)


def repo_analisis(db: Db, cifrador: CifradorDep) -> RepositorioAnalisis:
    return RepositorioAnalisisSQL(db, cifrador)


def repo_desafios(db: Db) -> RepositorioDesafios:
    return RepositorioDesafiosSQL(db)


def repo_auditoria(request: Request) -> RepositorioAuditoria:
    return RepositorioAuditoriaSQL(request.app.state.fabrica_sesiones)


def unidad_trabajo(db: Db) -> UnidadDeTrabajo:
    return UnidadDeTrabajoSQL(db)


def detector_fraude() -> DetectorFraude:
    return DetectorBenford()


# ------------------------------------------------------------------ Modelo: servicios


def servicio_auditoria(
    repositorio: Annotated[RepositorioAuditoria, Depends(repo_auditoria)],
    notificador: Annotated[Notificador, Depends(notificador_alertas)],
    contexto: Contexto,
) -> ServicioAuditoria:
    return ServicioAuditoria(repositorio, notificador, contexto)


ServAuditoria = Annotated[ServicioAuditoria, Depends(servicio_auditoria)]


def servicio_autenticacion(
    config: Config,
    usuarios: Annotated[RepositorioUsuarios, Depends(repo_usuarios)],
    sesiones: Annotated[RepositorioSesiones, Depends(repo_sesiones)],
    intentos: Annotated[RepositorioIntentosAcceso, Depends(repo_intentos_acceso)],
    desafios: Annotated[RepositorioDesafios, Depends(repo_desafios)],
    uow: Annotated[UnidadDeTrabajo, Depends(unidad_trabajo)],
    auditoria: ServAuditoria,
) -> ServicioAutenticacion:
    return ServicioAutenticacion(usuarios, sesiones, intentos, desafios, uow, auditoria, config)


def servicio_perfiles(
    perfiles: Annotated[RepositorioPerfiles, Depends(repo_perfiles)],
    auditoria: ServAuditoria,
) -> ServicioPerfiles:
    return ServicioPerfiles(perfiles, auditoria)


def servicio_analisis(
    config: Config,
    detector: Annotated[DetectorFraude, Depends(detector_fraude)],
    perfiles: Annotated[ServicioPerfiles, Depends(servicio_perfiles)],
    analisis: Annotated[RepositorioAnalisis, Depends(repo_analisis)],
    auditoria: ServAuditoria,
) -> ServicioAnalisis:
    return ServicioAnalisis(detector, perfiles, analisis, config.max_transacciones, auditoria)


ServAuth = Annotated[ServicioAutenticacion, Depends(servicio_autenticacion)]

# ------------------------------------------------------------------ Vistas


def vista_usuarios(config: Config) -> VistaUsuarios:
    return VistaUsuarios(config.exigir_segundo_factor_admin)


def vista_sesion(config: Config, usuarios: Annotated[VistaUsuarios, Depends(vista_usuarios)]) -> VistaSesion:
    return VistaSesion(config, usuarios)


def vista_perfiles() -> VistaPerfiles:
    return VistaPerfiles()


def vista_analisis() -> VistaAnalisis:
    return VistaAnalisis()


# ------------------------------------------------------------------ Controladores


def controlador_auth(
    config: Config, servicio: ServAuth, vista: Annotated[VistaSesion, Depends(vista_sesion)]
) -> ControladorAuth:
    return ControladorAuth(servicio, vista, config)


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
    limitador: Annotated[LimitadorConcurrencia, Depends(limitador_analisis)],
) -> ControladorAnalisis:
    return ControladorAnalisis(servicio, vista, limitador, config.max_tamano_csv_mb, config.max_transacciones)


def controlador_auditoria(servicio: ServAuditoria) -> ControladorAuditoria:
    return ControladorAuditoria(servicio, VistaAuditoria())


CtrlAuth = Annotated[ControladorAuth, Depends(controlador_auth)]
CtrlAuditoria = Annotated[ControladorAuditoria, Depends(controlador_auditoria)]
CtrlUsuarios = Annotated[ControladorUsuarios, Depends(controlador_usuarios)]
CtrlPerfiles = Annotated[ControladorPerfiles, Depends(controlador_perfiles)]
CtrlAnalisis = Annotated[ControladorAnalisis, Depends(controlador_analisis)]

# ------------------------------------------------------------------ autenticación / autorización


def sesion_actual(
    request: Request, config: Config, auth: ServAuth, contexto: Contexto, auditoria: ServAuditoria
) -> UsuarioAutenticado:
    """Valida la cookie de sesión y, en métodos que modifican datos, el token CSRF. Solo para las
    rutas de la propia sesión (consultarla, cambiar la contraseña, salir, doble factor)."""
    actual = auth.autenticar(request.cookies.get(config.cookie_sesion_nombre))
    contexto.actor = actual.usuario
    try:
        exigir_csrf_si_aplica(request, config, lambda token: auth.csrf_valido(actual.sesion, token))
    except PermisoDenegado:
        # Sesión válida sin su token CSRF: lo típico de una página ajena que intenta usarla.
        auditoria.registrar("csrf_invalido", Severidad.ADVERTENCIA, ruta=request.url.path)
        raise
    return actual


def usuario_actual(
    config: Config,
    actual: Annotated[UsuarioAutenticado, Depends(sesion_actual)],
) -> UsuarioAutenticado:
    """Sesión de un usuario que ya reemplazó la contraseña asignada y, si es administrador,
    que ya configuró la verificación en dos pasos."""
    if actual.usuario.debe_cambiar_contrasena:
        raise PermisoDenegado("Debe cambiar su contraseña antes de continuar")
    if actual.usuario.debe_configurar_segundo_factor(config.exigir_segundo_factor_admin):
        raise PermisoDenegado("Debe configurar la verificación en dos pasos antes de continuar")
    return actual


def admin_actual(
    request: Request,
    actual: Annotated[UsuarioAutenticado, Depends(usuario_actual)],
    auditoria: ServAuditoria,
) -> UsuarioAutenticado:
    if not actual.es_admin:
        auditoria.registrar("acceso_denegado", Severidad.ADVERTENCIA, ruta=request.url.path)
        raise PermisoDenegado("Se requiere rol de administrador")
    return actual


SesionActual = Annotated[UsuarioAutenticado, Depends(sesion_actual)]
UsuarioActual = Annotated[UsuarioAutenticado, Depends(usuario_actual)]
AdminActual = Annotated[UsuarioAutenticado, Depends(admin_actual)]
