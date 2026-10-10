# syntax=docker/dockerfile:1
# Imagen de producción de la API. Imágenes base fijadas por digest: la etiqueta puede cambiar
# de contenido, el digest no. Para actualizarlas: docker buildx imagetools inspect <imagen>

FROM ghcr.io/astral-sh/uv:0.13.0@sha256:cdc6093146eb3ff6a40107b38f008b789e050e77ad87865e381d9917da55a168 AS uv

# ---------------------------------------------------------------- construcción
FROM python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170 AS construccion
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app

# Dependencias primero (capa cacheable), exactamente las del uv.lock y sin las de desarrollo.
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

# ---------------------------------------------------------------- ejecución
FROM python:3.14-slim@sha256:a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170

RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app
# Solo el entorno virtual con el paquete instalado: sin código fuente, uv ni herramientas de build.
COPY --from=construccion --chown=root:root /app/.venv /app/.venv
COPY --chown=root:root alembic.ini ./

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FRAUDE_ENTORNO=produccion \
    WEB_CONCURRENCY=2 \
    # Solo se confía en X-Forwarded-For/Proto si vienen del proxy (red interna de Docker).
    FORWARDED_ALLOW_IPS=127.0.0.1

USER app
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/salud', timeout=2)"]

# --proxy-headers: la IP real del cliente (registrada en cada sesión) llega en X-Forwarded-For.
CMD ["uvicorn", "api_fraude_detection.main:create_app", "--factory", \
     "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header"]
