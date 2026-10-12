from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .cifrado import Cifrador


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
    # Sin valor se eligen solos: con HTTPS y sin dominio compartido llevan el prefijo "__Host-",
    # que obliga al navegador a aceptarlas solo si son Secure, de este mismo host y con Path=/.
    # Así un subdominio hermano (otro.midominio.com) no puede sembrar ni pisar estas cookies.
    cookie_sesion_nombre: str | None = None
    cookie_csrf_nombre: str | None = None
    # Entre la contraseña y el código de doble factor: identifica el intento (HttpOnly, 5 minutos).
    cookie_desafio_nombre: str | None = None
    minutos_desafio_segundo_factor: int = Field(default=5, ge=1, le=15)
    # Doble factor obligatorio para administradores. Solo puede apagarse fuera de producción.
    exigir_segundo_factor_admin: bool = True
    # Nombre que muestran las apps de autenticación junto a la cuenta.
    emisor_segundo_factor: str = Field(default="Auditoría de fraude", min_length=1, max_length=60)
    cabecera_csrf: str = "X-CSRF-Token"
    # En producción debe ir siempre en True (requiere HTTPS).
    cookie_segura: bool = True
    cookie_samesite: Literal["lax", "strict", "none"] = "strict"
    cookie_dominio: str | None = None
    sesion_minutos_inactividad: int = Field(default=30, ge=1)
    sesion_horas_absolutas: int = Field(default=8, ge=1)

    # --- Protección contra fuerza bruta ---
    # Los fallos se cuentan por nombre de usuario (exista o no) e IP dentro de una ventana
    # de `minutos_bloqueo`. Así un atacante solo se bloquea a sí mismo: no puede dejar sin
    # acceso a otro usuario desde su IP, ni averiguar qué cuentas existen.
    max_intentos_fallidos: int = Field(default=5, ge=1, description="Por usuario y desde una misma IP")
    max_intentos_fallidos_por_usuario: int = Field(
        default=50, ge=1, description="Por usuario desde cualquier IP (ataque distribuido)"
    )
    max_intentos_fallidos_por_ip: int = Field(
        default=30, ge=1, description="Desde una IP contra cualquier usuario (rociado de contraseñas)"
    )
    minutos_bloqueo: int = Field(default=15, ge=1, description="Ventana en la que se cuentan los fallos")

    # --- Cifrado de datos sensibles en la base (AES-256-GCM) ---
    # Claves base64 de 32 bytes separadas por comas; la primera cifra y las demás solo descifran
    # (rotación). Generar: uv run python -m api_fraude_detection.core.cifrado
    # Guárdelas fuera de la base y de los respaldos: sin ellas los datos cifrados no se recuperan.
    claves_cifrado: SecretStr | None = None

    # --- Alertas de seguridad ---
    # Además de los logs, cada alerta se puede enviar por POST (JSON) a este webhook HTTPS
    # (Slack, Teams, un SIEM...). La API necesita salida a Internet para usarlo.
    alertas_webhook_url: str | None = Field(default=None, pattern=r"^https://")
    alertas_webhook_segundos: float = Field(default=5, gt=0, le=30)

    # --- Usuario administrador inicial (solo se crea si no existe ningún usuario) ---
    # Debe cambiarla en su primer ingreso: después, el valor configurado ya no sirve para entrar
    # y puede retirarse del entorno.
    admin_usuario: str = "admin"
    admin_contrasena: SecretStr | None = None

    # --- Límites de entrada y de carga ---
    max_transacciones: int = Field(default=500_000, ge=1)
    max_tamano_csv_mb: int = Field(default=50, ge=1)
    max_tamano_json_mb: int = Field(
        default=20, ge=1, description="Cuerpo JSON: para volúmenes mayores, subir el extracto en CSV"
    )
    # Por proceso de la API (uvicorn arranca WEB_CONCURRENCY procesos).
    max_analisis_simultaneos: int = Field(default=2, ge=1)
    max_analisis_por_usuario: int = Field(default=1, ge=1)
    # Cuerpos de más de 1 MB recibiéndose a la vez: Starlette vuelca las subidas a /tmp y
    # varias de 50 MB llenarían el tmpfs del contenedor.
    max_subidas_simultaneas: int = Field(default=2, ge=1)

    # --- CORS (frontend con credenciales) ---
    origenes_cors: list[str] = ["http://localhost:5173"]

    @field_validator("alertas_webhook_url", "claves_cifrado", mode="before")
    @classmethod
    def _vacio_es_ninguno(cls, valor):
        # En docker compose una variable opcional sin definir llega como texto vacío.
        return None if isinstance(valor, str) and not valor.strip() else valor

    @field_validator("admin_contrasena", mode="after")
    @classmethod
    def _contrasena_inicial(cls, valor: SecretStr | None) -> SecretStr | None:
        if valor is None or not valor.get_secret_value():
            return None  # variable vacía = no crear administrador
        if len(valor.get_secret_value()) < 12:
            raise ValueError("admin_contrasena debe tener al menos 12 caracteres")
        return valor

    @model_validator(mode="after")
    def _coherencia(self) -> Self:
        if not self.url_base_datos.get_secret_value().startswith("postgresql"):
            raise ValueError("url_base_datos debe ser una URL de PostgreSQL (postgresql+psycopg://...)")
        prefijo = "__Host-" if self.cookie_segura and self.cookie_dominio is None else ""
        self.cookie_sesion_nombre = self.cookie_sesion_nombre or f"{prefijo}sid"
        self.cookie_csrf_nombre = self.cookie_csrf_nombre or f"{prefijo}csrf_token"
        self.cookie_desafio_nombre = self.cookie_desafio_nombre or f"{prefijo}desafio_2fa"
        for nombre in (self.cookie_sesion_nombre, self.cookie_csrf_nombre, self.cookie_desafio_nombre):
            if nombre.startswith("__Host-") and (not self.cookie_segura or self.cookie_dominio):
                raise ValueError(f"La cookie '{nombre}' exige cookie_segura=True y sin cookie_dominio")
            if nombre.startswith("__Secure-") and not self.cookie_segura:
                raise ValueError(f"La cookie '{nombre}' exige cookie_segura=True")
        if self.cookie_samesite == "none" and not self.cookie_segura:
            raise ValueError("SameSite=None exige cookie_segura=True")
        if self.max_intentos_fallidos > min(
            self.max_intentos_fallidos_por_usuario, self.max_intentos_fallidos_por_ip
        ):
            raise ValueError("max_intentos_fallidos no puede superar los límites por usuario ni por IP")
        if self.max_analisis_por_usuario > self.max_analisis_simultaneos:
            raise ValueError("max_analisis_por_usuario no puede superar max_analisis_simultaneos")
        if self.claves_cifrado is not None:
            Cifrador.desde_texto(self.claves_cifrado.get_secret_value())  # falla pronto si son inválidas
        if self.entorno == "produccion" and not self.exigir_segundo_factor_admin:
            raise ValueError("En producción el doble factor de los administradores es obligatorio")
        if self.entorno == "produccion" and not self.cookie_segura:
            raise ValueError("En producción las cookies deben ser seguras (HTTPS)")
        return self


@lru_cache
def obtener_settings() -> Settings:
    return Settings()
