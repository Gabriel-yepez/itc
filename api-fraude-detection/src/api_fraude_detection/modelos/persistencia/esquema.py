from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, text

_DIRECTORIO_MIGRACIONES = Path(__file__).parent / "migraciones"
# Clave arbitraria para pg_advisory_xact_lock: serializa migraciones entre réplicas que arrancan a la vez.
_CLAVE_BLOQUEO_MIGRACIONES = 0x0FA0DE


def configuracion_alembic() -> Config:
    config = Config()
    config.set_main_option("script_location", str(_DIRECTORIO_MIGRACIONES))
    return config


def aplicar_migraciones(motor: Engine) -> None:
    """Lleva el esquema a la última revisión de Alembic (idempotente)."""
    config = configuracion_alembic()
    with motor.begin() as conexion:
        conexion.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": _CLAVE_BLOQUEO_MIGRACIONES})
        config.attributes["connection"] = conexion
        command.upgrade(config, "head")
