from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, FechaUTC


class UsuarioORM(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN ('admin', 'analista')", name="rol_valido"),
        CheckConstraint("intentos_fallidos >= 0", name="intentos_no_negativos"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre_usuario: Mapped[str] = mapped_column(String(64), unique=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    intentos_fallidos: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(FechaUTC, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))


class SesionORM(Base):
    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    hash_token: Mapped[str] = mapped_column(String(64), unique=True)
    hash_csrf: Mapped[str] = mapped_column(String(64))
    expira_en: Mapped[datetime] = mapped_column(FechaUTC, index=True)
    ultima_actividad: Mapped[datetime] = mapped_column(FechaUTC)
    creada_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    agente_usuario: Mapped[str | None] = mapped_column(String(255), nullable=True)
    revocada: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class PerfilDeteccionORM(Base):
    __tablename__ = "perfiles_deteccion"
    __table_args__ = (
        # La BD garantiza que nunca haya dos perfiles predeterminados (índice único parcial).
        Index(
            "uq_perfiles_deteccion_un_predeterminado",
            "predeterminado",
            unique=True,
            postgresql_where=text("predeterminado"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)
    descripcion: Mapped[str] = mapped_column(Text, server_default="")
    parametros: Mapped[dict[str, Any]] = mapped_column(JSONB)
    predeterminado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))
    actualizado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))


class AnalisisORM(Base):
    __tablename__ = "analisis"
    __table_args__ = (
        CheckConstraint("nivel_riesgo IN ('bajo', 'medio', 'alto', 'critico')", name="nivel_valido"),
        CheckConstraint("puntaje BETWEEN 0 AND 100", name="puntaje_en_rango"),
        # Historial por usuario ordenado por fecha (consulta de GET /analisis).
        Index("ix_analisis_usuario_fecha", "usuario_id", text("creado_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"))
    perfil_id: Mapped[int | None] = mapped_column(
        ForeignKey("perfiles_deteccion.id", ondelete="SET NULL"), nullable=True
    )
    descripcion: Mapped[str] = mapped_column(String(255), server_default="")
    parametros: Mapped[dict[str, Any]] = mapped_column(JSONB)
    resultado: Mapped[dict[str, Any]] = mapped_column(JSONB)
    puntaje: Mapped[float] = mapped_column(Float)
    nivel_riesgo: Mapped[str] = mapped_column(String(20), index=True)
    total_transacciones: Mapped[int] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"), index=True)
