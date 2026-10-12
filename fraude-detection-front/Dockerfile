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
# Usuario sin privilegios: si alguien explotara Caddy no tendría root dentro del contenedor.
# Solo puede escribir sus certificados y su estado (/data, /config); la web y la config son de root.
# La imagen oficial le da al binario la capacidad de abrir los puertos 80/443 (setcap); se quita
# porque escucha en puertos altos, y sin root ni capacidades el kernel se negaría a ejecutarlo.
RUN addgroup -S -g 10001 caddy \
 && adduser -S -D -H -u 10001 -G caddy -s /sbin/nologin caddy \
 && mkdir -p /data/caddy /config/caddy \
 && chown -R caddy:caddy /data /config \
 && setcap -r /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=construccion /app/dist /srv
USER caddy
# Falla el build si el Caddyfile tiene errores. Ya como `caddy`: validar crea la CA local en /data
# y, hecho como root, dejaría archivos que el servidor luego no podría leer.
RUN DOMINIO=localhost ACME_EMAIL=validacion@example.com caddy validate --config /etc/caddy/Caddyfile
EXPOSE 8080 8443 8443/udp
