import os
import random
from decimal import Decimal

import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import Engine, text
from sqlalchemy.exc import OperationalError

from api_fraude_detection.core.cifrado import generar_clave
from api_fraude_detection.core.config import Settings
from api_fraude_detection.main import create_app
from api_fraude_detection.modelos.persistencia.base import crear_motor
from api_fraude_detection.modelos.persistencia.esquema import aplicar_migraciones

URL_PRUEBAS = (
    os.environ.get("FRAUDE_PRUEBAS_URL_BASE_DATOS")
    or dotenv_values(".env").get("FRAUDE_PRUEBAS_URL_BASE_DATOS")
    or "postgresql+psycopg://fraude:fraude_dev@localhost:5434/fraude_pruebas"
)
TABLAS = ", ".join(
    [
        "usuarios",
        "sesiones",
        "perfiles_deteccion",
        "analisis",
        "intentos_acceso",
        "desafios_segundo_factor",
        "eventos_auditoria",  # TRUNCATE no dispara el bloqueo de UPDATE/DELETE de la auditoría
    ]
)

ADMIN_USUARIO = "admin"
ADMIN_CLAVE = "clave-admin-segura-123"
# Clave de cifrado solo para la base de pruebas (se genera en cada ejecución).
CLAVE_CIFRADO_PRUEBAS = generar_clave()


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
        claves_cifrado=SecretStr(CLAVE_CIFRADO_PRUEBAS),
        # Las pruebas generales entran sin doble factor; el flujo con doble factor se prueba aparte.
        exigir_segundo_factor_admin=False,
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
def cliente(settings: Settings, bd_limpia: Engine):
    with TestClient(create_app(settings)) as c:
        # Las pruebas generales parten de un administrador que ya reemplazó su contraseña
        # inicial; el cambio obligatorio se prueba aparte (test_seguridad.py).
        with bd_limpia.begin() as conexion:
            conexion.execute(text("UPDATE usuarios SET debe_cambiar_contrasena = false"))
        yield c


def iniciar_sesion(cliente: TestClient, usuario: str = ADMIN_USUARIO, clave: str = ADMIN_CLAVE) -> str:
    respuesta = cliente.post("/auth/login", json={"usuario": usuario, "contrasena": clave})
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()["csrf_token"]


def crear_usuario_listo(
    cliente: TestClient, admin: dict[str, str], nombre: str, clave: str, rol: str = "analista"
) -> tuple[TestClient, dict[str, str]]:
    """Alta por el administrador y primer ingreso del usuario (cambia la contraseña asignada).
    Devuelve un cliente propio, con su sesión iniciada, y su cabecera CSRF."""
    temporal = f"{clave}-asignada"
    r = cliente.post(
        "/usuarios", json={"nombre_usuario": nombre, "contrasena": temporal, "rol": rol}, headers=admin
    )
    assert r.status_code == 201, r.text
    propio = TestClient(cliente.app)
    csrf = iniciar_sesion(propio, nombre, temporal)
    cambio = {"contrasena_actual": temporal, "contrasena_nueva": clave}
    r = propio.post("/auth/cambiar-contrasena", json=cambio, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 204, r.text
    return propio, {"X-CSRF-Token": iniciar_sesion(propio, nombre, clave)}


@pytest.fixture
def admin(cliente: TestClient) -> dict[str, str]:
    """Inicia sesión como admin y devuelve la cabecera CSRF a usar en POST/PATCH/DELETE."""
    return {"X-CSRF-Token": iniciar_sesion(cliente)}
