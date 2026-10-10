from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, FechaUTC


class UsuarioORM(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_usuario: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hash_contrasena: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    intentos_fallidos: Mapped[int] = mapped_column(Integer, default=0)
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(FechaUTC, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC)


class SesionORM(Base):
    __tablename__ = "sesiones"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    hash_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    hash_csrf: Mapped[str] = mapped_column(String(64))
    expira_en: Mapped[datetime] = mapped_column(FechaUTC, index=True)
    ultima_actividad: Mapped[datetime] = mapped_column(FechaUTC)
    creada_en: Mapped[datetime] = mapped_column(FechaUTC)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    agente_usuario: Mapped[str | None] = mapped_column(String(255), nullable=True)
    revocada: Mapped[bool] = mapped_column(Boolean, default=False)


class PerfilDeteccionORM(Base):
    __tablename__ = "perfiles_deteccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True)
    descripcion: Mapped[str] = mapped_column(Text, default="")
    parametros: Mapped[dict[str, Any]] = mapped_column(JSON)
    predeterminado: Mapped[bool] = mapped_column(Boolean, default=False)
    creado_por: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(FechaUTC)
    actualizado_en: Mapped[datetime] = mapped_column(FechaUTC)


class AnalisisORM(Base):
    __tablename__ = "analisis"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    perfil_id: Mapped[int | None] = mapped_column(
        ForeignKey("perfiles_deteccion.id", ondelete="SET NULL"), nullable=True
    )
    descripcion: Mapped[str] = mapped_column(String(255), default="")
    parametros: Mapped[dict[str, Any]] = mapped_column(JSON)
    resultado: Mapped[dict[str, Any]] = mapped_column(JSON)
    puntaje: Mapped[float] = mapped_column(Float)
    nivel_riesgo: Mapped[str] = mapped_column(String(20), index=True)
    total_transacciones: Mapped[int] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(FechaUTC, index=True)
