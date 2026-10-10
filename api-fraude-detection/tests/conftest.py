import os
import random
from decimal import Decimal

import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError

from api_fraude_detection.core.config import Settings
from api_fraude_detection.main import create_app
from api_fraude_detection.modelos.persistencia.base import crear_motor
from api_fraude_detection.modelos.persistencia.esquema import aplicar_migraciones

URL_PRUEBAS = (
    os.environ.get("FRAUDE_PRUEBAS_URL_BASE_DATOS")
    or dotenv_values(".env").get("FRAUDE_PRUEBAS_URL_BASE_DATOS")
    or "postgresql+psycopg://fraude:fraude_dev@localhost:5434/fraude_pruebas"
)
TABLAS = "usuarios, sesiones, perfiles_deteccion, analisis"

ADMIN_USUARIO = "admin"
ADMIN_CLAVE = "clave-admin-segura-123"


def montos_benford(n: int, semilla: int = 7) -> list[Decimal]:
    """Montos log-uniformes en 6 órdenes de magnitud: siguen la Ley de Benford."""
    rng = random.Random(semilla)
    return [Decimal(f"{10 ** rng.uniform(1, 7):.2f}") for _ in range(n)]


def montos_inventados(n: int, semilla: int = 7) -> list[Decimal]:
    """Montos uniformes en un rango estrecho, como los que inventa una persona."""
    rng = random.Random(semilla)
    return [Decimal(f"{rng.uniform(5_000, 9_999):.2f}") for _ in range(n)]


def _settings_pruebas() -> Settings:
    return Settings(
        entorno="pruebas",
        url_base_datos=SecretStr(URL_PRUEBAS),
        bd_pool_tamano=2,
        migrar_al_iniciar=False,  # el esquema ya lo migró `motor_pruebas`
        cookie_segura=False,
        admin_usuario=ADMIN_USUARIO,
        admin_contrasena=SecretStr(ADMIN_CLAVE),
        max_intentos_fallidos=3,
    )


@pytest.fixture(scope="session")
def motor_pruebas() -> Engine:
    """Esquema creado desde cero con las migraciones de Alembic (así también se prueban)."""
    motor = crear_motor(_settings_pruebas())
    try:
        with motor.connect() as conexion:
            base = conexion.execute(text("SELECT current_database()")).scalar_one()
    except OperationalError:
        pytest.skip(
            f"PostgreSQL de pruebas no disponible ({motor.url.render_as_string()}): docker compose up -d"
        )
    if "prueba" not in base:
        pytest.exit(f"Por seguridad las pruebas solo borran bases '*prueba*', no '{base}'", returncode=2)

    with motor.begin() as conexion:
        conexion.execute(text("DROP SCHEMA public CASCADE"))
        conexion.execute(text("CREATE SCHEMA public"))
    aplicar_migraciones(motor)
    yield motor
    motor.dispose()


@pytest.fixture
def bd_limpia(motor_pruebas: Engine) -> Engine:
    with motor_pruebas.begin() as conexion:
        conexion.execute(text(f"TRUNCATE {TABLAS} RESTART IDENTITY CASCADE"))
    return motor_pruebas


@pytest.fixture
def settings(bd_limpia: Engine) -> Settings:
    return _settings_pruebas()


@pytest.fixture
def cliente(settings: Settings):
    with TestClient(create_app(settings)) as c:
        yield c


def iniciar_sesion(cliente: TestClient, usuario: str = ADMIN_USUARIO, clave: str = ADMIN_CLAVE) -> str:
    respuesta = cliente.post("/auth/login", json={"usuario": usuario, "contrasena": clave})
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()["csrf_token"]


@pytest.fixture
def admin(cliente: TestClient) -> dict[str, str]:
    """Inicia sesión como admin y devuelve la cabecera CSRF a usar en POST/PATCH/DELETE."""
    return {"X-CSRF-Token": iniciar_sesion(cliente)}
