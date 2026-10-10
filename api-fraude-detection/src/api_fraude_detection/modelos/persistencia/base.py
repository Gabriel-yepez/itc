from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import DateTime, Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from ...core.config import Settings

# Nombres de restricciones deterministas: necesarios para que Alembic genere migraciones estables.
CONVENCION_NOMBRES = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCION_NOMBRES)


class FechaUTC(TypeDecorator[datetime]):
    """TIMESTAMPTZ que rechaza datetimes sin zona y devuelve siempre UTC."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Se requiere un datetime con zona horaria")
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def crear_motor(settings: Settings) -> Engine:
    return create_engine(
        settings.url_base_datos.get_secret_value(),
        pool_size=settings.bd_pool_tamano,
        max_overflow=settings.bd_pool_extra,
        pool_recycle=settings.bd_pool_reciclar_segundos,
        pool_pre_ping=True,
        connect_args={
            "application_name": "api-fraude-detection",
            # Sesión en UTC y tope por consulta para que una petición no bloquee la BD.
            "options": f"-c timezone=UTC -c statement_timeout={settings.bd_timeout_sentencia_ms}",
        },
    )


def crear_fabrica_sesiones(motor: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def sesion_por_peticion(fabrica: sessionmaker[Session]) -> Iterator[Session]:
    """Unidad de trabajo por petición: commit si todo fue bien, rollback si hubo error."""
    with fabrica() as sesion:
        try:
            yield sesion
            sesion.commit()
        except Exception:
            sesion.rollback()
            raise
