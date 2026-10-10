"""Garantías que aporta PostgreSQL además de la lógica de la aplicación."""

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError

from api_fraude_detection.modelos.dominio.entidades import PerfilDeteccion
from api_fraude_detection.modelos.dominio.parametros import ParametrosDeteccion
from api_fraude_detection.modelos.persistencia import tablas  # noqa: F401
from api_fraude_detection.modelos.persistencia.base import Base, crear_fabrica_sesiones
from api_fraude_detection.modelos.repositorios.sql import RepositorioPerfilesSQL
from api_fraude_detection.modelos.servicios.perfiles import ServicioPerfiles


def test_migraciones_al_dia_con_los_modelos(bd_limpia: Engine):
    """Si falla: falta una migración. Ejecute `uv run alembic revision --autogenerate -m ...`."""
    with bd_limpia.connect() as conexion:
        contexto = MigrationContext.configure(conexion, opts={"compare_type": True})
        assert compare_metadata(contexto, Base.metadata) == []


def test_bd_impide_dos_perfiles_predeterminados(bd_limpia: Engine):
    with crear_fabrica_sesiones(bd_limpia)() as db:
        repo = RepositorioPerfilesSQL(db)
        repo.guardar(PerfilDeteccion(nombre="A", parametros=ParametrosDeteccion(), predeterminado=True))
        with pytest.raises(IntegrityError):
            repo.guardar(PerfilDeteccion(nombre="B", parametros=ParametrosDeteccion(), predeterminado=True))


def test_servicio_cambia_el_predeterminado_respetando_el_indice(bd_limpia: Engine):
    with crear_fabrica_sesiones(bd_limpia).begin() as db:
        servicio = ServicioPerfiles(RepositorioPerfilesSQL(db))
        a = servicio.crear("A", ParametrosDeteccion(), "", predeterminado=True, creado_por=None)
        b = servicio.crear("B", ParametrosDeteccion(), "", predeterminado=True, creado_por=None)
        servicio.actualizar(a.id, predeterminado=True)
        assert servicio.obtener(a.id).predeterminado and not servicio.obtener(b.id).predeterminado


def test_parametros_guardados_como_jsonb_consultables(bd_limpia: Engine):
    with crear_fabrica_sesiones(bd_limpia).begin() as db:
        RepositorioPerfilesSQL(db).guardar(
            PerfilDeteccion(nombre="X", parametros=ParametrosDeteccion(z_critico=2.57))
        )
    with bd_limpia.connect() as conexion:
        valor = conexion.execute(
            text("SELECT (parametros->>'z_critico')::float FROM perfiles_deteccion WHERE nombre = 'X'")
        ).scalar_one()
    assert valor == 2.57
