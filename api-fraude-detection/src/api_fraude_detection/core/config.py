from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la API, leída de variables de entorno con prefijo FRAUDE_ (o de .env)."""

    model_config = SettingsConfigDict(env_prefix="FRAUDE_", env_file=".env", extra="ignore")

    nombre_app: str = "API Detección de Fraude - Ley de Benford"
    entorno: Literal["desarrollo", "produccion", "pruebas"] = "desarrollo"

    # --- PostgreSQL ---
    # SecretStr: la URL incluye la contraseña y así no aparece en logs ni en repr().
    url_base_datos: SecretStr = SecretStr("postgresql+psycopg://fraude:fraude_dev@localhost:5434/fraude")
    bd_pool_tamano: int = Field(default=10, ge=1)
    bd_pool_extra: int = Field(default=20, ge=0, description="Conexiones adicionales en picos")
    bd_pool_reciclar_segundos: int = Field(default=1800, ge=60)
    bd_timeout_sentencia_ms: int = Field(default=30_000, ge=1000, description="statement_timeout")
    # Aplica las migraciones de Alembic pendientes al arrancar (con bloqueo para varias réplicas).
    migrar_al_iniciar: bool = True

    # --- Sesión por cookies ---
    cookie_sesion_nombre: str = "sid"
    cookie_csrf_nombre: str = "csrf_token"
    cabecera_csrf: str = "X-CSRF-Token"
    # En producción debe ir siempre en True (requiere HTTPS).
    cookie_segura: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] = "strict"
    cookie_dominio: str | None = None
    sesion_minutos_inactividad: int = Field(default=30, ge=1)
    sesion_horas_absolutas: int = Field(default=8, ge=1)

    # --- Protección contra fuerza bruta ---
    max_intentos_fallidos: int = Field(default=5, ge=1)
    minutos_bloqueo: int = Field(default=15, ge=1)

    # --- Usuario administrador inicial (solo se crea si no existe ningún usuario) ---
    admin_usuario: str = "admin"
    admin_contrasena: SecretStr | None = None

    # --- Límites de entrada ---
    max_transacciones: int = Field(default=500_000, ge=1)
    max_tamano_csv_mb: int = Field(default=50, ge=1)

    # --- CORS (frontend con credenciales) ---
    origenes_cors: list[str] = ["http://localhost:5173"]

    @model_validator(mode="after")
    def _coherencia(self) -> Self:
        if not self.url_base_datos.get_secret_value().startswith("postgresql"):
            raise ValueError("url_base_datos debe ser una URL de PostgreSQL (postgresql+psycopg://...)")
        if self.cookie_samesite == "none" and not self.cookie_segura:
            raise ValueError("SameSite=None exige cookie_segura=True")
        if self.entorno == "produccion" and not self.cookie_segura:
            raise ValueError("En producción las cookies deben ser seguras (HTTPS)")
        return self


@lru_cache
def obtener_settings() -> Settings:
    return Settings()
