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
    LargeBinary,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, FechaUTC


class UsuarioORM(Base):
    __tablename__ = "usuarios"
    __table_args__ = (CheckConstraint("rol IN ('admin', 'analista')", name="rol_valido"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre_usuario: Mapped[str] = mapped_column(String(64), unique=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    debe_cambiar_contrasena: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    # Secreto TOTP cifrado con AES-GCM (ver core/cifrado.py).
    totp_secreto: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    totp_activo: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    totp_ultimo_paso: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    codigos_recuperacion: Mapped[list[str]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))


class DesafioSegundoFactorORM(Base):
    __tablename__ = "desafios_segundo_factor"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    hash_token: Mapped[str] = mapped_column(String(64), unique=True)
    expira_en: Mapped[datetime] = mapped_column(FechaUTC, index=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"))


class EventoAuditoriaORM(Base):
    """Registro de auditoría. Solo admite INSERT: un disparador en la base rechaza UPDATE y DELETE
    (ver la migración `auditoria_doble_factor_y_cifrado`)."""

    __tablename__ = "eventos_auditoria"
    __table_args__ = (
        CheckConstraint("severidad IN ('info', 'advertencia', 'critica')", name="severidad_valida"),
        Index("ix_eventos_auditoria_momento", text("momento DESC")),
        Index("ix_eventos_auditoria_severidad_momento", "severidad", text("momento DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    momento: Mapped[datetime] = mapped_column(FechaUTC)
    tipo: Mapped[str] = mapped_column(String(60), index=True)
    severidad: Mapped[str] = mapped_column(String(12))
    # Sin clave foránea: un ON DELETE modificaría eventos, y el registro es inmutable.
    usuario_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nombre_usuario: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    detalle: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))


class IntentoAccesoORM(Base):
    """Inicio de sesión fallido. Se guarda el nombre tal como se escribió, exista o no la cuenta:
    así el bloqueo se comporta igual para usuarios reales e inventados (no revela cuáles existen)."""

    __tablename__ = "intentos_acceso"
    __table_args__ = (
        Index("ix_intentos_acceso_usuario_fecha", "nombre_usuario", "creado_en"),
        Index("ix_intentos_acceso_ip_fecha", "ip", "creado_en"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    nombre_usuario: Mapped[str] = mapped_column(String(64))
    ip: Mapped[str] = mapped_column(String(45))
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, index=True)


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
    # Descripción y resultado (montos, cuentas señaladas) cifrados con AES-GCM. Los parámetros
    # quedan en claro: no son datos de clientes y se consultan por JSONB.
    descripcion: Mapped[bytes] = mapped_column(LargeBinary)
    parametros: Mapped[dict[str, Any]] = mapped_column(JSONB)
    resultado: Mapped[bytes] = mapped_column(LargeBinary)
    puntaje: Mapped[float] = mapped_column(Float)
    nivel_riesgo: Mapped[str] = mapped_column(String(20), index=True)
    total_transacciones: Mapped[int] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, server_default=text("now()"), index=True)
