# Despliegue de producción — Detección de fraude

```
                Internet
                   │  :80 (redirige) / :443 HTTPS
           ┌───────▼────────┐  red "publica"
           │  web (Caddy)   │  certificado Let's Encrypt automático
           │                │  /         → archivos del build de React
           │                │  /api/*    → quita "/api" y reenvía a la API
           └───────┬────────┘
   red "interna"   │  (sin salida a Internet, sin puertos publicados)
           ┌───────▼────────┐        ┌──────────────┐
           │  api (FastAPI) │───────►│  postgres 18 │
           └────────────────┘        └──────────────┘
```

El navegador solo habla con **un origen** (`https://DOMINIO`): el frontend y `/api` salen del
mismo sitio. Por eso las cookies de sesión son de primer nivel, no hace falta CORS y el
token CSRF solo viaja a nuestro propio dominio.

| Archivo | Qué define |
|---|---|
| [`compose.yaml`](compose.yaml) | los 3 servicios, redes, volúmenes y endurecimiento |
| [`../fraude-detection-front/Caddyfile`](../fraude-detection-front/Caddyfile) | HTTPS, proxy `/api`, SPA, cabeceras de seguridad (CSP, HSTS...) |
| [`../fraude-detection-front/Dockerfile`](../fraude-detection-front/Dockerfile) | build de Vite + imagen de Caddy |
| [`../api-fraude-detection/Dockerfile`](../api-fraude-detection/Dockerfile) | imagen de la API (usuario sin privilegios, sin código fuente) |

## Puesta en marcha en un servidor

Requisitos: un servidor Linux con Docker y un dominio cuyo registro DNS (A/AAAA) apunte a él,
con los puertos 80 y 443 abiertos.

```bash
git clone <repo> && cd <repo>/despliegue-fraude
cp .env.example .env
openssl rand -hex 32          # úsela para POSTGRES_PASSWORD
openssl rand -hex 16          # úsela para ADMIN_CONTRASENA
nano .env                     # DOMINIO, ACME_EMAIL y las contraseñas
docker compose up -d --build
```

Al arrancar: Postgres se inicializa, la API aplica las migraciones de Alembic y crea el
administrador, y Caddy obtiene el certificado HTTPS. Entre en `https://DOMINIO` y cambie la
contraseña del administrador.

### Probar en local exactamente igual que en producción

```bash
# .env con DOMINIO=localhost, PUERTO_HTTP=8080, PUERTO_HTTPS=8443 y contraseñas
docker compose up -d --build
curl -k https://localhost:8443/api/salud
```

Con `localhost` Caddy usa su propia CA local; el navegador mostrará un aviso de certificado.

## Operación

```bash
git pull && docker compose up -d --build   # actualizar (las migraciones se aplican solas)
docker compose logs -f api                 # registros
docker compose ps                          # estado y healthchecks
docker compose exec api alembic current    # versión del esquema

# Copia de seguridad y restauración de la base de datos
docker compose exec -T postgres pg_dump -U fraude -Fc fraude > respaldo_$(date +%F).dump
docker compose exec -T postgres pg_restore -U fraude -d fraude --clean < respaldo.dump
```

Los volúmenes `datos_postgres` y `caddy_datos` (certificados) deben conservarse entre
despliegues; `docker compose down -v` los **borra**.

## Seguridad incluida

- **HTTPS obligatorio** con renovación automática y redirección 80 → 443. Las cookies son
  `Secure`, `HttpOnly` y `SameSite=Strict`.
- **Cabeceras**: HSTS, CSP estricta (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`.
  Además, Caddy elimina la cabecera `Server`.
- **Aislamiento de red**: la API y Postgres no publican puertos ni tienen salida a Internet.
- **IP real del cliente**: la API solo acepta `X-Forwarded-For` desde la IP fija de Caddy, así
  que un cliente no puede falsificar la IP que se registra en su sesión.
- **Contenedores**: la API corre como usuario sin privilegios con sistema de archivos de solo
  lectura; todos con `no-new-privileges` y sin capacidades de Linux innecesarias.
- **Imágenes base fijadas por digest** y dependencias instaladas desde los lockfiles
  (`uv.lock`, `pnpm-lock.yaml`) con verificación de integridad.
- **Sin documentación interactiva** (`/docs`) en producción.

## Si ya existe un balanceador o proxy delante

Si el servidor ya tiene Nginx o un balanceador en la nube que termina TLS, ese equipo debe
reenviar todo el tráfico a Caddy. En ese caso, cambie `{$DOMINIO}` por `:80` en el Caddyfile y
configure `trusted_proxies` con la IP del balanceador.
