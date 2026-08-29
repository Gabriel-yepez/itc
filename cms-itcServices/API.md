# API del CMS para el frontend

Módulos creados en este Strapi para que el frontend Next.js (`../frontend`) deje
de tener el contenido escrito a mano en los componentes.

Base: `http://localhost:1337/api` · Todos los endpoints de lectura son públicos
(rol `public`, sin token).

## Cómo está organizado

Cada página del frontend consume **un single type** (los textos fijos de esa
página: cabeceras, CTA, SEO) más **las colecciones** que alimentan sus listas.

| Página del frontend | Single type | Colecciones que consume |
| --- | --- | --- |
| `/` | `GET /home-page` | `clients`, `competencies` |
| `/servicios` | `GET /services-page` | `services`, `methodology-steps`, `certifications` |
| `/proyectos` | `GET /projects-page` | `projects` |
| `/contacto` | `GET /contact-page` | — (escribe en `contact-submissions`) |
| `/privacidad`, `/terminos`, `/seguridad` | — | `legal-pages` (por `slug`) |
| `Navbar` + `Footer` (layout) | `GET /global` | — |

## Endpoints

### Solo lectura

| Método | Ruta | Devuelve |
| --- | --- | --- |
| `GET` | `/global` | Nombre del sitio, logo, `navLinks`, `footerLinks`, sede, contacto directo y SEO por defecto |
| `GET` | `/home-page` | `hero`, `about` (con `stats`), encabezados de secciones, `seo` |
| `GET` | `/services-page` | Cabeceras de ambas pestañas, encabezados de sección, `cta`, `seo` |
| `GET` | `/projects-page` | Encabezado, barra de `stats`, `cta`, `seo` |
| `GET` | `/contact-page` | Encabezado, sede, canal directo, `inquiryOptions`, textos de éxito, `seo` |
| `GET` | `/services` · `/services/:documentId` | Tarjetas de servicio de ambas pestañas |
| `GET` | `/projects` · `/projects/:documentId` | Portafolio |
| `GET` | `/clients` · `/clients/:documentId` | Logos de clientes |
| `GET` | `/competencies` | Competencias principales |
| `GET` | `/methodology-steps` | Fases de metodología y del ciclo de seguridad |
| `GET` | `/certifications` | Barra de cumplimiento |
| `GET` | `/legal-pages` · `/legal-pages/:documentId` | Páginas legales |

Los routers están limitados a `find`/`findOne`: la REST API no expone
`create`/`update`/`delete` para ningún contenido editorial. El contenido se
gestiona desde `/admin`.

### Escritura: formulario de contacto

```
POST /api/contact-submissions
Content-Type: application/json

{ "data": {
    "name": "Ada Lovelace",
    "email": "ada@empresa.com",
    "subject": "Auditoría de Seguridad & Zero-Trust",
    "message": "…",
    "company": "…",   // opcional
    "phone": "…",     // opcional
    "source": "/contacto",  // opcional
    "website": ""     // honeypot: debe ir vacío
} }
```

Respuestas: `201 { "data": { "ok": true, "documentId": "…" } }`,
`400` si falla la validación, `429` si se superan 5 envíos por IP en 10 minutos.

El controlador reconstruye el registro campo a campo, así que `status`, `notes`
y `handledAt` no pueden fijarse desde el navegador. Los mensajes **no se pueden
leer por la API**: solo `create` está enrutado; la bandeja se revisa en `/admin`.

## Consultas

`populate` y `sort` ya vienen por defecto en cada controlador, así que
`GET /api/services` devuelve el objeto completo y ordenado por `order`. Si la
petición trae sus propios `populate`/`sort`, ganan los de la petición.

Filtros habituales:

```
GET /api/services?filters[track][$eq]=software      # pestaña "Desarrollo & Software"
GET /api/services?filters[track][$eq]=security      # pestaña "Ciberseguridad"
GET /api/methodology-steps?filters[track][$eq]=development
GET /api/projects?filters[featured][$eq]=true
GET /api/legal-pages?filters[slug][$eq]=privacidad
```

Los campos `anchor` (en `services`) y `slug` (en `legal-pages`) coinciden con los
enlaces que ya usa el `Footer`: `/servicios#web`, `/servicios#cloud`,
`/servicios#mobile`, `/servicios#devsecops`, `/privacidad`, `/terminos`,
`/seguridad`.

## Campos de presentación

Varios campos existen para que el frontend siga renderizando el diseño actual
sin lógica extra:

- `accent`: `primary` · `secondary` · `tertiary` · `neutral` — mapea a los colores del tema.
- `layout` (en `services`): `standard` · `wide` (`md:col-span-2`) · `centered`.
- `icon` / `panelIcon`: clave de icono; el SVG sigue viviendo en el frontend.
- `gradient` (en `projects`): clases Tailwind del degradado de cabecera.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # completar secretos
pnpm develop           # crea las tablas y concede los permisos públicos
node ./scripts/seed-itc.js   # carga el contenido actual del frontend
```

El seed es idempotente: identifica los registros por su clave natural (`slug`,
`name`, `code`, `track`+`stepNumber`), así que volver a ejecutarlo actualiza en
lugar de duplicar.

Los permisos del rol `public` se conceden **una sola vez**, en el primer arranque
con esta base de datos (`src/index.ts`). Si después se revoca un permiso desde el
panel, los arranques posteriores respetan esa decisión.

CORS: `CORS_ORIGINS` en `.env` (por defecto `http://localhost:3000`).
