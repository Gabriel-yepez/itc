# API de detección de fraude — Ley de Benford (banca venezolana)

API en FastAPI que analiza operaciones bancarias con la **Ley de Benford** y señales
complementarias (fraccionamiento bajo umbrales, montos redondos), adaptada al contexto
venezolano: bolívares/dólares a tasa BCV, reconversiones monetarias, canales locales
(Pago Móvil, punto de venta, Biopago...) y CSV con formato `1.234,56`.
Todas las entradas de la detección son **parametrizables** mediante perfiles.

## Arranque

Requisitos: Docker y [uv](https://docs.astral.sh/uv/).

```bash
docker compose up -d          # PostgreSQL 18 en localhost:5434 (bases fraude y fraude_pruebas)
cp .env.example .env          # defina FRAUDE_ADMIN_CONTRASENA
uv sync
uv run api-fraude-detection   # http://127.0.0.1:8000/docs
uv run pytest                 # corre contra la base fraude_pruebas
```

Al iniciar, la API aplica las migraciones de Alembic pendientes y crea el usuario
administrador (si la BD está vacía) y el perfil predeterminado **"Banca venezolana - referencia"**.

## Base de datos: PostgreSQL

- Driver **psycopg 3**; pool configurable (`FRAUDE_BD_POOL_*`), sesión en UTC y
  `statement_timeout` para que ninguna consulta bloquee la BD indefinidamente.
- **Migraciones con Alembic** en `modelos/persistencia/migraciones/`. Se aplican al arrancar
  bajo un `pg_advisory_lock` (seguro con varias réplicas) o manualmente:

  ```bash
  uv run alembic upgrade head                                 # aplicar
  uv run alembic revision --autogenerate -m "agrega columna"  # tras cambiar tablas.py
  uv run alembic upgrade head --sql                           # SQL para revisión de un DBA
  ```

  Un test falla si `tablas.py` cambia sin su migración.
- Integridad garantizada por la propia BD: `CHECK` de roles, niveles de riesgo y puntaje;
  **índice único parcial** que impide dos perfiles predeterminados; claves foráneas con
  `CASCADE` / `SET NULL` / `RESTRICT` según el caso.
- Parámetros y resultados en **JSONB**, consultables con SQL, p. ej.:
  `SELECT id FROM analisis WHERE resultado->'hallazgos' @> '["..."]'` o
  `SELECT parametros->>'z_critico' FROM perfiles_deteccion`.
- Fechas en `TIMESTAMPTZ` (UTC).

| Tabla | Contenido |
|---|---|
| `usuarios` | credenciales (hash Argon2), rol, bloqueo por intentos |
| `sesiones` | hash del token de sesión y del CSRF, expiración, IP, revocación |
| `perfiles_deteccion` | parámetros de detección (JSONB), predeterminado |
| `analisis` | parámetros usados + resultado (JSONB), puntaje y nivel de riesgo |

## Arquitectura: MVC + repositorios + inyección de dependencias

```
src/api_fraude_detection/
├── modelos/                 M — datos y reglas de negocio (no conoce HTTP)
│   ├── dominio/             entidades, parámetros, detector y pruebas de Benford (puro)
│   ├── persistencia/        tablas PostgreSQL, motor/pool, migraciones Alembic
│   ├── repositorios/        interfaces.py (contratos ABC) + sql.py (SQLAlchemy)
│   └── servicios/           casos de uso: autenticación, perfiles, análisis, CSV
├── vistas/                  V — formato de salida: DTOs de respuesta y cookies de sesión
├── controladores/           C — recibe la entrada (DTOs de solicitud), invoca al Modelo,
│                                elige la Vista
├── rutas/                   tabla URL → acción del controlador (+ guardas de rol)
├── contenedor.py            DI: BD → repositorios → servicios → vistas → controladores
└── core/                    configuración, errores, hashing, CSRF, cabeceras
```

Flujo de una petición:

```
HTTP ─► ruta ─► Controlador ─► Servicio (Modelo) ─► Repositorio (interfaz) ─► BD
                    │                                   ▲
                    └──► Vista ─► JSON / cookies        └─ implementación inyectada
```

- **Modelo** no importa nada de `vistas`, `controladores` ni FastAPI.
- **Vista** decide qué se expone (p. ej. nunca el hash de contraseña) y gestiona las cookies.
- **Controlador** no contiene reglas de negocio ni acceso a datos: orquesta.
- **Contenedor** es el único sitio que elige implementaciones concretas. Cualquier eslabón
  se sustituye sin tocar el resto: `app.dependency_overrides[detector_fraude] = MiDetector`
  (`tests/test_api.py`) o un controlador sobre un repositorio en memoria (`tests/test_mvc.py`).

## Sesión con cookies

| Medida | Detalle |
|---|---|
| Token de sesión opaco | 256 bits, en cookie `sid` **HttpOnly + Secure + SameSite=Strict**; en BD solo se guarda su SHA-256 |
| CSRF | Cookie `csrf_token` legible + cabecera `X-CSRF-Token` obligatoria en POST/PATCH/DELETE (hash ligado a la sesión) |
| Contraseñas | Argon2id, rehash automático, verificación señuelo contra enumeración de usuarios |
| Fuerza bruta | Bloqueo temporal tras N intentos fallidos (configurable) |
| Expiración | Por inactividad (30 min) y absoluta (8 h); logout y cambio de contraseña revocan en servidor |
| Roles | `admin` gestiona usuarios y perfiles; `analista` ejecuta y consulta sus análisis |
| Cabeceras | HSTS, `X-Frame-Options`, `nosniff`, `no-store`, CORS con credenciales solo a orígenes configurados |

Frontend (fetch): enviar `credentials: "include"` y la cabecera `X-CSRF-Token` con el valor
de la cookie `csrf_token` (o el devuelto por `/auth/login`).

## Endpoints

| Método | Ruta | Rol |
|---|---|---|
| POST | `/auth/login` · `/auth/logout` · `/auth/cambiar-contrasena` | — / sesión |
| GET | `/auth/sesion` | sesión |
| GET/POST/PATCH | `/usuarios` | admin |
| GET | `/perfiles`, `/perfiles/{id}`, `/perfiles/parametros/referencia`, `/perfiles/parametros/esquema` | sesión |
| POST/PATCH/DELETE | `/perfiles` | admin |
| POST | `/analisis` (JSON) · `/analisis/csv` (multipart) | sesión |
| GET | `/analisis`, `/analisis/{id}` | sesión (analista: solo los propios) |

```json
POST /analisis
{
  "perfil_id": 1,
  "parametros": { "canales": ["pago_movil"], "tasa_bcv_predeterminada": "36.50" },
  "transacciones": [
    { "monto": "1520.75", "moneda": "VES", "fecha": "2024-03-15", "canal": "pago_movil",
      "tipo": "debito", "cuenta": "hash-cuenta-1", "tasa_bcv": "36.42" }
  ]
}
```

Los parámetros efectivos son: perfil indicado (o el predeterminado) + sobrescrituras de la
petición (los objetos anidados se combinan campo a campo). Se guardan con el resultado para
auditoría; las transacciones no se almacenan.

## Qué se detecta

**Pruebas de Benford** (sobre montos convertidos a la moneda base):
primer dígito, segundo dígito, primeros dos dígitos y últimos dos dígitos. Para cada una:
MAD con los cortes de conformidad de Nigrini, chi², Kolmogorov-Smirnov y z por dígito.

Dos correcciones evitan falsos positivos (ambas desactivables):
- **MAD ajustada por tamaño de muestra**: los cortes de Nigrini suponen muestras grandes; con
  1.000 datos perfectamente Benford, la prueba de primeros dos dígitos ya da MAD ≈ 0,0024 >
  0,0022 ("no conformidad"). Se descuenta la MAD esperada por puro azar.
- **Bonferroni** en los z por dígito: con 90-100 dígitos, ~5 salen "atípicos" por azar a z=1,96.

Con datos simulados: 0 de 300 conjuntos naturales (n = 300/1.000/5.000) salieron con riesgo
alto o crítico; 90/90 conjuntos inventados salieron críticos.

**Señales complementarias**
- *Fraccionamiento ("pitufeo")*: concentración de operaciones justo debajo de umbrales
  vigilados (reporte SUDEBAN, límites de Pago Móvil, topes internos), comparada con la razón
  que predice Benford.
- *Montos redondos*: exceso de múltiplos de 100 sobre el monto original, excluyendo canales
  donde son normales (efectivo y divisas).
- *Segmentación*: el mismo análisis por cuenta o por canal para señalar el foco.

**Puntaje 0-100 → nivel** `bajo | medio | alto | critico`: la prueba de dígitos más severa +
umbrales + redondeo, con pesos y cortes configurables.

## Parámetros (resumen)

| Grupo | Parámetros |
|---|---|
| Moneda | `moneda_base` (VES/USD), `tasa_bcv_predeterminada`, `aplicar_reconversion` (2008 ÷10³, 2018 ÷10⁵, 2021 ÷10⁶) |
| Población | `monto_minimo`, `monto_maximo`, `canales`, `tipos_operacion` |
| Benford | `pruebas`, `tamano_muestra_minimo`, `umbrales_mad`, `z_critico`, `alfa`, `ajustar_mad_por_tamano`, `corregir_comparaciones_multiples` |
| Segmentación | `agrupar_por` (cuenta/canal), `max_grupos_reportados` |
| Señales | `umbrales_vigilados[]`, `factor_concentracion_umbral`, `minimo_transacciones_banda`, `multiplo_redondo`, `factor_exceso_redondos`, `canales_excluidos_redondeo` |
| Puntaje | `ponderaciones.*`, `cortes_nivel_riesgo.*` |

El esquema completo, con descripciones y rangos, está en `GET /perfiles/parametros/esquema`.
CSV: `formato` admite `delimitador`, `separador_decimal`, `formato_fecha`, `codificacion`,
`columnas` (mapeo a los nombres del archivo) y `omitir_filas_invalidas`.

> El umbral de 10.000 USD del perfil de referencia es un **ejemplo**: ajústelo a la normativa
> SUDEBAN vigente y a los límites de su institución.

## Limitaciones

- Benford es una herramienta de **cribado**, no prueba de fraude: señala poblaciones para auditar.
- No aplica a montos con tope o rango estrecho (tarifas fijas, Pago Móvil con límite bajo,
  nóminas); la API lo advierte cuando los montos abarcan menos de 2 órdenes de magnitud.
- Las credenciales de `docker-compose.yml` son de desarrollo: en producción use un usuario
  propio con contraseña fuerte, TLS (`?sslmode=require`) y copias de seguridad.
