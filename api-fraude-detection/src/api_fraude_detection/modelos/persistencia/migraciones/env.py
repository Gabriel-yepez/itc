"""Entorno de Alembic.

- Desde la CLI (`alembic upgrade head`) usa la URL de FRAUDE_URL_BASE_DATOS.
- Desde la app (`aplicar_migraciones`) reutiliza la conexión que recibe en `config.attributes`.
"""

from alembic import context
from sqlalchemy import Connection

from api_fraude_detection.core.config import Settings
from api_fraude_detection.modelos.persistencia import tablas  # noqa: F401  (registra las tablas)
from api_fraude_detection.modelos.persistencia.base import Base, FechaUTC, crear_motor

metadata_objetivo = Base.metadata


def _renderizar_tipo(tipo_, objeto, autogen_context):
    """Las migraciones no deben depender de tipos de la app: FechaUTC se escribe como TIMESTAMPTZ."""
    if tipo_ == "type" and isinstance(objeto, FechaUTC):
        return "sa.DateTime(timezone=True)"
    return False


def _ejecutar(conexion: Connection) -> None:
    context.configure(
        connection=conexion,
        target_metadata=metadata_objetivo,
        compare_type=True,
        compare_server_default=True,
        render_item=_renderizar_tipo,
    )
    with context.begin_transaction():
        context.run_migrations()


def migrar_en_linea() -> None:
    conexion = context.config.attributes.get("connection")
    if conexion is not None:
        _ejecutar(conexion)
        return
    motor = crear_motor(Settings())
    with motor.connect() as conexion:
        _ejecutar(conexion)
    motor.dispose()


def migrar_fuera_de_linea() -> None:
    """Genera el SQL sin conectarse (`alembic upgrade head --sql`), p. ej. para un DBA."""
    context.configure(
        url=Settings().url_base_datos.get_secret_value(),
        target_metadata=metadata_objetivo,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    migrar_fuera_de_linea()
else:
    migrar_en_linea()
