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
           ┌───────▼────────┐        ┌──────────────┐       ┌─────────────────┐
           │  api (FastAPI) │───────►│  postgres 18 │◄──────│ respaldos (age) │
           └────────────────┘        └──────────────┘       └─────────────────┘
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
| [`respaldos/`](respaldos) | imagen y scripts de respaldo cifrado (`respaldar.sh`) y restauración (`restaurar.sh`) |

## Puesta en marcha en un servidor

Requisitos: un servidor Linux con Docker y un dominio cuyo registro DNS (A/AAAA) apunte a él,
con los puertos 80 y 443 abiertos.

```bash
git clone <repo> && cd <repo>/despliegue-fraude
cp .env.example .env
openssl rand -hex 32          # úsela para POSTGRES_PASSWORD
openssl rand -hex 16          # úsela para ADMIN_CONTRASENA
docker compose build api && docker compose run --rm --no-deps api python -m api_fraude_detection.core.cifrado
                              # úsela para CLAVES_CIFRADO (y guárdela también fuera del servidor)
nano .env                     # DOMINIO, ACME_EMAIL, contraseñas, CLAVES_CIFRADO y RESPALDO_CLAVE_PUBLICA
docker compose up -d --build
```

`RESPALDO_CLAVE_PUBLICA` se genera **en su equipo**, no en el servidor (ver
[Respaldos](#respaldos-cifrados)).

Al arrancar: Postgres se inicializa, la API aplica las migraciones de Alembic y crea el
administrador, Caddy obtiene el certificado HTTPS y se hace el primer respaldo. Entre en
`https://DOMINIO`: la app le pedirá cambiar la contraseña del administrador y luego configurar
la verificación en dos pasos. Después, borre `ADMIN_CONTRASENA` del `.env`.

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

docker compose exec respaldos respaldar --una-vez   # respaldo inmediato
docker compose logs api | grep ALERTA               # alertas de seguridad
```

Los volúmenes `datos_postgres`, `respaldos` y `caddy_datos` (certificados) deben conservarse
entre despliegues; `docker compose down -v` los **borra**.

## Respaldos cifrados

El servicio `respaldos` ejecuta `pg_dump` cada `RESPALDO_INTERVALO_SEGUNDOS` (24 h por defecto),
cifra el resultado con [age](https://age-encryption.org) y borra los de más de
`RESPALDO_RETENCION_DIAS` (14). El cifrado usa una **clave pública**: el servidor puede crear
respaldos pero no leerlos. Aunque alguien se lleve el servidor y los respaldos, sin la clave
privada no obtiene nada. Si el último respaldo tiene más de dos intervalos, el contenedor queda
`unhealthy`.

1. **En su equipo** (no en el servidor) genere el par de claves:
   `age-keygen -o clave-respaldos.txt`. Copie la línea `age1...` a `RESPALDO_CLAVE_PUBLICA` y
   guarde `clave-respaldos.txt` en un gestor de secretos o fuera de línea.
2. **Copie los respaldos fuera del servidor** (rsync, almacenamiento de objetos...): si viven en
   el mismo disco que la base, no le protegen de perder el servidor. Con
   `RESPALDOS_DIRECTORIO=/srv/respaldos-fraude` quedan en una carpeta fácil de sincronizar.
3. **Restaure** montando la clave privada solo para la operación. Por defecto se restaura en una
   base **nueva** para revisarla antes de usarla:

   ```bash
   docker compose run --rm --no-deps \
     -v "$PWD/clave-respaldos.txt:/run/secrets/clave-respaldos.txt:ro" \
     --entrypoint restaurar respaldos /respaldos/fraude-20261012T030000Z.dump.age fraude_restaurada
   ```

   Antes de crear o tocar ninguna base, el script comprueba que la clave abre el respaldo y que
   el archivo no fue alterado. Para reemplazar la base en uso agregue `--reemplazar` (detenga la
   API antes).
4. **Practique la restauración** de vez en cuando: un respaldo que nunca se restauró no está
   probado.

Los respaldos contienen los datos tal como están en la base: los análisis y los secretos de doble
factor siguen cifrados también con `CLAVES_CIFRADO`. Para recuperar todo hacen falta **las dos
claves**: la privada de age y `CLAVES_CIFRADO`.

## Cifrado de los datos

- **En la aplicación**: la descripción y el resultado de cada análisis (montos, cuentas
  señaladas) y los secretos de doble factor se guardan cifrados con AES-256-GCM
  (`CLAVES_CIFRADO`). Un acceso directo a la base, un volcado o un respaldo no los revela.
  Para **rotar** la clave, agregue una nueva al principio de `CLAVES_CIFRADO` (separadas por
  comas) y reinicie la API. Lo nuevo se cifra con ella y lo anterior se sigue leyendo con las
  demás. No retire una clave vieja mientras haya datos cifrados con ella.
- **En el disco**: cifre el volumen del servidor (LUKS en Linux, o discos cifrados del proveedor
  de nube). Eso protege también la configuración de Postgres, los índices y los certificados.

## Doble factor, auditoría y alertas

- **Doble factor (TOTP)**: obligatorio para los administradores (la API no arranca en
  producción si se desactiva). Funciona con Google Authenticator, Microsoft Authenticator, Aegis,
  1Password... Al activarlo se entregan 10 códigos de recuperación de un solo uso. Quien pierda
  el teléfono y los códigos necesita que **otro** administrador restablezca su verificación, lo
  que genera una alerta crítica.
- **Registro de auditoría**: inicios de sesión (y fallidos), bloqueos, cambios de contraseña,
  de doble factor, de usuarios, roles y perfiles de detección, análisis ejecutados, CSRF inválidos
  y accesos denegados. La tabla `eventos_auditoria` es **inmutable**: un disparador de
  PostgreSQL rechaza `UPDATE` y `DELETE`, también desde la propia aplicación. Los administradores
  la consultan en la app (botón «Auditoría»).
- **Alertas**: los eventos de severidad advertencia o crítica se escriben en el log con el
  prefijo `ALERTA`, para que los vigile su recolector de logs. Con `ALERTAS_WEBHOOK_URL` también
  se envían por POST a un webhook HTTPS (Slack, Teams, un SIEM). La API no tiene salida a
  Internet: para un webhook externo, agréguele una red con salida o use un relé interno.

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
  (`uv.lock`, `pnpm-lock.yaml`) con verificación de integridad. Ni uv ni pnpm aceptan versiones
  publicadas hace menos de 24 h (`exclude-newer`, `minimumReleaseAge`): los paquetes
  comprometidos suelen detectarse y retirarse en ese plazo.
- **Sin documentación interactiva** (`/docs`) en producción.

## Si ya existe un balanceador o proxy delante

Si el servidor ya tiene Nginx o un balanceador en la nube que termina TLS, ese equipo debe
reenviar todo el tráfico a Caddy. En ese caso, cambie `{$DOMINIO}` por `:80` en el Caddyfile y
configure `trusted_proxies` con la IP del balanceador.
