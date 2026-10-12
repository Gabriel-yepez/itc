from pathlib import Path

from alembic import command
from alembic.config import Config
from pydantic import SecretStr
from sqlalchemy import Engine, text

_DIRECTORIO_MIGRACIONES = Path(__file__).parent / "migraciones"
# Clave arbitraria para pg_advisory_xact_lock: serializa migraciones entre réplicas que arrancan a la vez.
_CLAVE_BLOQUEO_MIGRACIONES = 0x0FA0DE


def configuracion_alembic() -> Config:
    config = Config()
    config.set_main_option("script_location", str(_DIRECTORIO_MIGRACIONES))
    return config


def aplicar_migraciones(
    motor: Engine, claves_cifrado: SecretStr | None = None, revision: str = "head"
) -> None:
    """Lleva el esquema a `revision` (idempotente). Las migraciones que cifran datos usan
    `claves_cifrado` (las de la app); sin ellas, las leen de FRAUDE_CLAVES_CIFRADO."""
    config = configuracion_alembic()
    with motor.begin() as conexion:
        conexion.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": _CLAVE_BLOQUEO_MIGRACIONES})
        config.attributes["connection"] = conexion
        config.attributes["claves_cifrado"] = claves_cifrado
        command.upgrade(config, revision)


def revertir_migraciones(motor: Engine, revision: str, claves_cifrado: SecretStr | None = None) -> None:
    config = configuracion_alembic()
    with motor.begin() as conexion:
        config.attributes["connection"] = conexion
        config.attributes["claves_cifrado"] = claves_cifrado
        command.downgrade(config, revision)
