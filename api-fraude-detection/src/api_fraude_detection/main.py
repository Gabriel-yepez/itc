import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import text

from .core.config import Settings, obtener_settings
from .core.errores import ErrorDominio
from .core.seguridad_http import CABECERAS_SEGURIDAD
from .modelos.persistencia.base import crear_fabrica_sesiones, crear_motor
from .modelos.persistencia.esquema import aplicar_migraciones
from .modelos.repositorios.sql import (
    RepositorioPerfilesSQL,
    RepositorioSesionesSQL,
    RepositorioUsuariosSQL,
    UnidadDeTrabajoSQL,
)
from .modelos.servicios.autenticacion import ServicioAutenticacion
from .modelos.servicios.perfiles import ServicioPerfiles
from .rutas import analisis, auth, perfiles, usuarios

log = logging.getLogger(__name__)

# Serializa la carga de datos iniciales cuando arrancan varias réplicas a la vez.
_CLAVE_BLOQUEO_DATOS_INICIALES = 0x0FA0DF


def _inicializar_datos(app: FastAPI) -> None:
    """Migra el esquema y crea el administrador inicial (si se configuró) y el perfil de referencia."""
    settings: Settings = app.state.settings
    if settings.migrar_al_iniciar:
        aplicar_migraciones(app.state.motor)
    with app.state.fabrica_sesiones.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": _CLAVE_BLOQUEO_DATOS_INICIALES})
        auth = ServicioAutenticacion(
            RepositorioUsuariosSQL(db), RepositorioSesionesSQL(db), UnidadDeTrabajoSQL(db), settings
        )
        if auth.asegurar_admin_inicial():
            log.info("Usuario administrador '%s' creado", settings.admin_usuario)
        elif RepositorioUsuariosSQL(db).contar() == 0:
            log.warning("No hay usuarios: defina FRAUDE_ADMIN_CONTRASENA para crear el administrador")
        auth.purgar_sesiones()
        ServicioPerfiles(RepositorioPerfilesSQL(db)).asegurar_perfil_inicial()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or obtener_settings()

    @asynccontextmanager
    async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
        _inicializar_datos(app)
        yield
        app.state.motor.dispose()

    app = FastAPI(
        title=settings.nombre_app,
        description=(
            "Detección de fraude en operaciones bancarias venezolanas mediante la Ley de Benford, "
            "con parámetros configurables por perfil y sesión segura por cookies."
        ),
        version="0.1.0",
        lifespan=ciclo_de_vida,
        docs_url=None if settings.entorno == "produccion" else "/docs",
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.motor = crear_motor(settings)
    app.state.fabrica_sesiones = crear_fabrica_sesiones(app.state.motor)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origenes_cors,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", settings.cabecera_csrf],
    )

    @app.middleware("http")
    async def cabeceras_seguridad(request: Request, call_next):
        respuesta = await call_next(request)
        for nombre, valor in CABECERAS_SEGURIDAD.items():
            respuesta.headers.setdefault(nombre, valor)
        if settings.cookie_segura:
            respuesta.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return respuesta

    @app.exception_handler(ErrorDominio)
    async def manejar_error_dominio(_: Request, error: ErrorDominio) -> JSONResponse:
        return JSONResponse(status_code=error.codigo_http, content={"detail": error.mensaje})

    @app.exception_handler(ValidationError)
    async def manejar_validacion(_: Request, error: ValidationError) -> JSONResponse:
        # Errores al combinar parámetros de perfil con sobrescrituras.
        return JSONResponse(
            status_code=422,
            content={"detail": error.errors(include_url=False, include_context=False, include_input=False)},
        )

    @app.get("/salud", tags=["Sistema"])
    def salud() -> dict[str, str]:
        return {"estado": "ok"}

    for modulo in (auth, usuarios, perfiles, analisis):
        app.include_router(modulo.router)
    return app
