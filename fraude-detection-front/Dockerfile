# syntax=docker/dockerfile:1
# Imagen de producción del frontend: build de Vite servido por Caddy (HTTPS automático + proxy /api).
# Imágenes base fijadas por digest. Para actualizarlas: docker buildx imagetools inspect <imagen>

# ---------------------------------------------------------------- construcción
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS construccion
WORKDIR /app
# Corepack instala la versión exacta de pnpm declarada en package.json ("packageManager").
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --frozen-lockfile: instala exactamente lo del lockfile (con sus hashes de integridad) o falla.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------------------------------------------------------------- servidor web
FROM caddy:2.11-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=construccion /app/dist /srv
# Falla el build si el Caddyfile tiene errores.
RUN DOMINIO=localhost ACME_EMAIL=validacion@example.com caddy validate --config /etc/caddy/Caddyfile
