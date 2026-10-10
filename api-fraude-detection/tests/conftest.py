import random
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from api_fraude_detection.core.config import Settings
from api_fraude_detection.main import create_app

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


@pytest.fixture
def settings() -> Settings:
    return Settings(
        entorno="pruebas",
        url_base_datos="sqlite://",
        cookie_segura=False,
        admin_usuario=ADMIN_USUARIO,
        admin_contrasena=SecretStr(ADMIN_CLAVE),
        max_intentos_fallidos=3,
    )


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
