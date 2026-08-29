# Implementación: conectar el frontend al CMS

Guía de implementación para conectar `frontend/` (Next.js 16.2.11) con la API de
`cms-itcServices/` (Strapi 5.51.2). El CMS ya está construido, sembrado y
verificado; **este documento cubre únicamente el lado del frontend**.

Lee `cms-itcServices/API.md` antes de empezar: describe los endpoints, los
filtros y el comportamiento de publicación.

---

## 0. Contexto obligatorio antes de escribir código

### 0.1 Reglas del repositorio (`CLAUDE.md` / `AGENTS.md`)

- App Router exclusivamente. **No existe `src/`**: el alias `@/*` apunta a la
  raíz del repo.
- **Todo el texto de contenido va en `text-black`.** Nada de `text-foreground`,
  `text-black/70` ni grises. La única excepción es el texto cuyo color lo impone
  la variante de su componente (p. ej. el label blanco de un `ButtonGeneric`
  `primary`).
- `middleware.ts` no existe en Next 16; se llama `proxy.ts`. No lo necesitamos
  aquí.
- No hay framework de tests ni formateador. `pnpm lint` y `pnpm build` son las
  únicas verificaciones automáticas disponibles.

### 0.2 Cache Components está ACTIVO

`next.config.ts` tiene `cacheComponents: true` y `reactCompiler: true`. Esto no
es negociable ni opcional: **cambia cómo se debe escribir todo el fetching**.

```ts
// next.config.ts (estado actual — no lo modifiques salvo para imágenes)
const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  cacheLife: {
    hourly:  { stale: 300, revalidate: 3600, expire: 86400 },
    default: { stale: 300, revalidate: 3600, expire: 86400 },
  },
};
```

Consecuencias que **romperán el build** si las ignoras:

1. Un `fetch` sin cachear fuera de un ámbito `use cache` provoca **error en
   desarrollo y en build**, no un warning.
2. Dentro de un ámbito `use cache` **no puedes** llamar a `cookies()`,
   `headers()` ni leer `searchParams`. Léelos fuera y pásalos como argumentos.
3. Con `use cache` a nivel de archivo, **todas las exportaciones deben ser
   funciones `async`**. Por eso en este plan la directiva va *por función*, no
   al principio del archivo: así los archivos pueden exportar también tipos y
   constantes.
4. `generateMetadata` sigue las mismas reglas que un componente: si hace fetch,
   necesita su propio `'use cache'`.
5. Los argumentos y valores capturados por *closure* forman parte de la clave de
   caché, y **deben ser serializables**.
6. **El CMS tiene que estar corriendo durante `pnpm build`.** Los ámbitos
   `use cache` se prerenderizan en build; si Strapi está caído, el build falla.

Existe un perfil propio llamado `hourly`. Úsalo: `cacheLife('hourly')`.

### 0.3 Dependencias

`qs@6.15.3` y `@types/qs@6.15.1` ya están instalados. **Usa `qs` para construir
todas las query strings de Strapi** — los filtros anidados y el `populate`
profundo son inviables a mano.

`react-markdown` **no** está instalado y hará falta (ver §7.3).

---

## 1. Alcance

### Qué hay que conectar

| Página | Single type | Colecciones |
| --- | --- | --- |
| `app/page.tsx` | `/home-page` | `/clients` |
| `app/servicios/page.tsx` | `/services-page` | `/services`, `/methodology-steps`, `/certifications` |
| `app/proyectos/page.tsx` | `/projects-page` | `/projects` |
| `app/contacto/page.tsx` | `/contact-page` | escribe en `/contact-submissions` |
| `app/seguridad/page.tsx` | `/security-page` | — |
| `app/privacidad`, `app/terminos` | — | `/legal-pages` (por `slug`) |
| `Navbar` + `Footer` | `/global` | — |

`app/services/page.tsx` y `app/contact/page.tsx` son re-exports de una línea; no
los toques.

### Qué NO se mueve al CMS (queda en código, es intencional)

- Los `path` de todos los SVG.
- Clases Tailwind, patrones decorativos y animaciones.
- Labels y placeholders del formulario ("Nombre Completo", "Ej. Alexander
  Hamilton"…), y el botón "Enviar otro mensaje".
- Cromo decorativo: `ESTADO DE RED`, `ONLINE`, `LATENCIA < 20ms`,
  `SLA Garantizado 99.99%`, el mockup de terminal SOC, `Fase 01 de 04`,
  `Consultar Solución Similar`.
- `openGraph`, `twitter`, `robots`, `icons`, `viewport` de `lib/seo.ts`.

---

## 2. Contrato de la API

### 2.1 Envoltorio

Colecciones:

```json
{ "data": [ /* … */ ], "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 6 } } }
```

Single types: `data` es un objeto, sin `meta.pagination`.

Errores (incluye un single type nunca publicado):

```json
{ "data": null, "error": { "status": 404, "name": "NotFoundError", "message": "Not Found", "details": {} } }
```

### 2.2 Payload real de `/services` (capturado, no inventado)

```json
{
  "id": 26,
  "documentId": "ote30xl62jp99vesd8n1pq0w",
  "title": "Arquitectura Cloud & Backend",
  "slug": "arquitectura-cloud-backend",
  "anchor": "cloud",
  "track": "software",
  "description": "Sistemas distribuidos resilientes…",
  "body": null,
  "icon": "cloud",
  "accent": "tertiary",
  "layout": "wide",
  "badge": "Escala Empresarial",
  "order": 2,
  "createdAt": "2026-08-29T00:26:29.889Z",
  "updatedAt": "2026-08-29T00:40:26.185Z",
  "publishedAt": "2026-08-29T00:40:26.188Z",
  "features": [
    { "id": 49, "label": "API Gateways & Microservicios", "description": "Microservicios GraphQL…", "marker": "01", "accent": "primary" },
    { "id": 50, "label": "Pipelines de Datos", "description": "Procesamiento en tiempo real…", "marker": "02", "accent": "secondary" }
  ],
  "tags": [],
  "cover": null,
  "seo": null
}
```

Observa: **los campos opcionales llegan `null`** (`body`, `cover`, `seo`,
`anchor`, `icon`, `badge`) y **los componentes repetibles vacíos llegan `[]`**,
nunca `null`. Tipa en consecuencia y no asumas presencia.

### 2.3 Detalles del servidor que condicionan las consultas

- `config/api.ts` tiene **`strictParams: true`**: un parámetro de query
  desconocido devuelve error. No inventes parámetros.
- `defaultLimit: 25`, **`maxLimit: 100`**. Pide siempre
  `pagination[pageSize]=100` explícitamente en las colecciones. Pedir más **no da
  error: Strapi recorta en silencio a 100** (verificado: `pageSize=500` responde
  `200` con `meta.pagination.pageSize: 100`). Es decir, ninguna colección puede
  traer más de 100 filas en una petición; si alguna crece por encima, habrá que
  paginar de verdad y hoy nada avisará de que faltan filas.
- `populate` y `sort` ya vienen por defecto desde los controladores del CMS. **No
  hace falta enviarlos.** Si los envías, los tuyos ganan y perderás el populate
  profundo (`ui.cta` → `ui.link` no se resuelve con `populate=*`).
- CORS permite `http://localhost:3000` vía `CORS_ORIGINS` en el `.env` del CMS.

---

## 3. Variables de entorno

Crea `frontend/.env.local`:

```bash
# Origen del CMS. Se usa desde el servidor (fetch de datos) y desde el navegador
# (POST del formulario de contacto), por eso es NEXT_PUBLIC_.
NEXT_PUBLIC_CMS_URL=http://localhost:1337
```

Y añade `.env.local` a `.gitignore` si no está.

> No hace falta token: todos los endpoints de lectura son públicos y el POST del
> formulario también.

---

## 4. Capa de datos

Crea el directorio `lib/cms/`. **No pongas `'use cache'` a nivel de archivo** en
ninguno de estos ficheros: exportan tipos y constantes, y la directiva a nivel de
archivo exige que *todas* las exportaciones sean funciones async.

### 4.1 `lib/cms/types.ts`

Tipos derivados de los esquemas reales del CMS.

```ts
export type Accent = "primary" | "secondary" | "tertiary" | "neutral";
export type ServiceTrack = "software" | "security";
export type MethodologyTrack = "development" | "security";
export type ServiceLayout = "standard" | "wide" | "centered";

/** Todo documento de Strapi 5 trae estos campos. */
export type StrapiDoc = {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** Las instancias de componente traen `id`; no lo uses como key de React. */
type ComponentId = { id: number };

export type CmsMedia = ComponentId & {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

export type CmsLink = ComponentId & {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  external: boolean;
};

export type CmsTag = ComponentId & { label: string };
export type CmsMetric = ComponentId & { label: string; value: string };
export type CmsStat = ComponentId & { value: string; label: string; accent: Accent };

export type CmsFeature = ComponentId & {
  label: string;
  description: string | null;
  marker: string | null;
  accent: Accent;
};

export type CmsSectionHeading = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent: Accent;
  align: "left" | "center";
};

export type CmsCta = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent: Accent;
  primaryLink: CmsLink | null;
  secondaryLink: CmsLink | null;
};

export type CmsHero = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent: Accent;
  image: CmsMedia | null;
  primaryLink: CmsLink | null;
  secondaryLink: CmsLink | null;
  panelTitle: string | null;
  panelDescription: string | null;
  panelIcon: string | null;
};

export type CmsSeo = ComponentId & {
  metaTitle: string;
  metaDescription: string;
  /** Separadas por comas. Hay que hacer split antes de pasarlas a Metadata. */
  keywords: string | null;
  canonicalURL: string | null;
  shareImage: CmsMedia | null;
};

export type CmsOffice = ComponentId & {
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  note: string | null;
};

export type CmsChannel = ComponentId & {
  label: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
};

export type CmsFooterLink = ComponentId & {
  group: "servicios" | "empresa" | "legal";
  label: string;
  href: string;
  order: number;
};

export type CmsInquiryOption = ComponentId & {
  label: string;
  value: string;
  isDefault: boolean;
};

// ---------- Colecciones ----------

export type Service = StrapiDoc & {
  title: string;
  slug: string;
  anchor: string | null;
  track: ServiceTrack;
  description: string;
  body: string | null;
  icon: string | null;
  accent: Accent;
  layout: ServiceLayout;
  badge: string | null;
  order: number;
  features: CmsFeature[];
  tags: CmsTag[];
  cover: CmsMedia | null;
  seo: CmsSeo | null;
};

export type Project = StrapiDoc & {
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  description: string;
  body: string | null;
  tags: CmsTag[];
  metric: CmsMetric | null;
  gradient: string | null;
  /** OJO: el diseño actual de ProjectsGrid no renderiza icono. Campo sin uso. */
  icon: string | null;
  featured: boolean;
  order: number;
  cover: CmsMedia | null;
  gallery: CmsMedia[] | null;
  seo: CmsSeo | null;
};

export type Client = StrapiDoc & {
  name: string;
  industry: string;
  icon: string | null;
  logo: CmsMedia | null;
  website: string | null;
  order: number;
};

export type MethodologyStep = StrapiDoc & {
  stepNumber: string;
  title: string;
  description: string;
  track: MethodologyTrack;
  accent: Accent;
  order: number;
};

export type Certification = StrapiDoc & {
  label: string;
  code: string;
  icon: string | null;
  badge: CmsMedia | null;
  order: number;
};

export type LegalPage = StrapiDoc & {
  title: string;
  slug: string;
  summary: string | null;
  effectiveDate: string | null;
  /** Markdown. Requiere renderizador (ver §7.3). */
  content: string;
  seo: CmsSeo | null;
};

// ---------- Single types ----------

export type Global = StrapiDoc & {
  siteName: string;
  siteUrl: string | null;
  siteDescription: string;
  tagline: string | null;
  footerAbout: string | null;
  logo: CmsMedia | null;
  favicon: CmsMedia | null;
  navLinks: CmsLink[];
  footerLinks: CmsFooterLink[];
  socialLinks: CmsLink[];
  office: CmsOffice | null;
  channel: CmsChannel | null;
  defaultSeo: CmsSeo | null;
};

export type HomePage = StrapiDoc & {
  hero: CmsHero | null;
  about:
    | (ComponentId & {
        eyebrow: string | null;
        title: string;
        /** Texto plano con párrafos separados por \n\n. Ver §7.3. */
        body: string;
        image: CmsMedia | null;
        stats: CmsStat[];
        anchor: string | null;
      })
    | null;
  clientsHeading: CmsSectionHeading | null;
  seo: CmsSeo | null;
};

export type ServicesPage = StrapiDoc & {
  softwareTabLabel: string | null;
  securityTabLabel: string | null;
  softwareHero: CmsHero | null;
  softwareHeading: CmsSectionHeading | null;
  methodologyHeading: CmsSectionHeading | null;
  securityHero: CmsHero | null;
  certificationsTitle: string | null;
  securityHeading: CmsSectionHeading | null;
  securityLifecycleHeading: CmsSectionHeading | null;
  cta: CmsCta | null;
  seo: CmsSeo | null;
};

export type ProjectsPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  stats: CmsStat[];
  cta: CmsCta | null;
  seo: CmsSeo | null;
};

export type ContactPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  office: CmsOffice | null;
  channel: CmsChannel | null;
  inquiryOptions: CmsInquiryOption[];
  submitLabel: string | null;
  successTitle: string | null;
  successMessage: string | null;
  seo: CmsSeo | null;
};

export type SecurityPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  pillars: CmsFeature[];
  cta: CmsCta | null;
  seo: CmsSeo | null;
};
```

### 4.2 `lib/cms/client.ts` — cliente HTTP con `qs`

```ts
import qs from "qs";

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:1337";
export const CMS_API = `${CMS_URL}/api`;

export class CmsError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(`[CMS ${status}] ${path} — ${message}`);
    this.name = "CmsError";
  }
}

type Envelope<T> = {
  data: T;
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
};

/**
 * Construye la query en el formato que espera Strapi.
 *
 * `encodeValuesOnly: true` deja los corchetes sin codificar
 * (`filters[track][$eq]=software`), que es la convención de Strapi. Sin esta
 * opción qs produce `filters%5Btrack%5D%5B%24eq%5D` y, con `strictParams: true`
 * activo en el CMS, la petición se rechaza.
 */
export function buildQuery(query?: Record<string, unknown>): string {
  if (!query || Object.keys(query).length === 0) return "";
  return `?${qs.stringify(query, { encodeValuesOnly: true })}`;
}

/**
 * Devuelve `null` en 404 — es lo que responde Strapi para un single type que
 * todavía no se ha publicado. Cualquier otro fallo lanza: si el CMS está caído
 * queremos que el build reviente de forma ruidosa, no que se publique un sitio
 * vacío.
 *
 * Llamar a esta función SOLO desde dentro de un ámbito `use cache`.
 */
export async function cmsFetch<T>(
  path: string,
  query?: Record<string, unknown>,
): Promise<T | null> {
  const url = `${CMS_API}${path}${buildQuery(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new CmsError(res.status, path, await res.text().catch(() => res.statusText));
  }

  const json = (await res.json()) as Envelope<T>;
  return json.data;
}

/** Azúcar para colecciones: pide el máximo permitido y normaliza a array. */
export async function cmsFetchMany<T>(
  path: string,
  query: Record<string, unknown> = {},
): Promise<T[]> {
  const data = await cmsFetch<T[]>(path, {
    ...query,
    // maxLimit del CMS es 100. Pedir más no falla: Strapi recorta en silencio,
    // así que 100 es el techo real por petición.
    pagination: { pageSize: 100 },
  });
  return data ?? [];
}
```

### 4.3 `lib/cms/queries.ts` — funciones cacheadas

Aquí va `use cache`, **una directiva por función**.

```ts
import { cacheLife, cacheTag } from "next/cache";
import { cmsFetch, cmsFetchMany } from "./client";
import type {
  Certification, Client, ContactPage, Global, HomePage, LegalPage,
  MethodologyStep, MethodologyTrack, Project, ProjectsPage, SecurityPage,
  Service, ServiceTrack, ServicesPage,
} from "./types";

export async function getGlobal(): Promise<Global | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:global");
  return cmsFetch<Global>("/global");
}

export async function getHomePage(): Promise<HomePage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:home-page");
  return cmsFetch<HomePage>("/home-page");
}

export async function getServicesPage(): Promise<ServicesPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services-page");
  return cmsFetch<ServicesPage>("/services-page");
}

export async function getProjectsPage(): Promise<ProjectsPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:projects-page");
  return cmsFetch<ProjectsPage>("/projects-page");
}

export async function getContactPage(): Promise<ContactPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:contact-page");
  return cmsFetch<ContactPage>("/contact-page");
}

export async function getSecurityPage(): Promise<SecurityPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:security-page");
  return cmsFetch<SecurityPage>("/security-page");
}

/** `track` forma parte de la clave de caché: cada pestaña cachea por separado. */
export async function getServices(track: ServiceTrack): Promise<Service[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services");
  return cmsFetchMany<Service>("/services", { filters: { track: { $eq: track } } });
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:projects");
  return cmsFetchMany<Project>("/projects");
}

export async function getClients(): Promise<Client[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:clients");
  return cmsFetchMany<Client>("/clients");
}

export async function getMethodologySteps(track: MethodologyTrack): Promise<MethodologyStep[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:methodology-steps");
  return cmsFetchMany<MethodologyStep>("/methodology-steps", {
    filters: { track: { $eq: track } },
  });
}

export async function getCertifications(): Promise<Certification[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:certifications");
  return cmsFetchMany<Certification>("/certifications");
}

export async function getLegalPage(slug: string): Promise<LegalPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:legal-pages", `cms:legal-page:${slug}`);
  const rows = await cmsFetchMany<LegalPage>("/legal-pages", {
    filters: { slug: { $eq: slug } },
  });
  return rows[0] ?? null;
}
```

Query generada por `getServices("software")`, para que la verifiques a mano:

```
/api/services?filters[track][$eq]=software&pagination[pageSize]=100
```

---

## 5. Mapas de presentación

### 5.1 ⚠️ Tailwind v4 no ve las clases que viven en la base de datos

Este es **el punto donde más fácil se rompe todo**. Tailwind genera CSS
escaneando los ficheros fuente. Una clase que solo existe en una fila de Strapi
(`from-primary/20 via-primary/5 to-transparent`, `text-secondary`) **no se
genera** y el estilo desaparece en silencio: sin error, sin warning.

Dos consecuencias obligatorias:

**a) Nunca interpoles.** Esto no funciona:

```tsx
<div className={`text-${service.accent}`} />          // ❌ clase inexistente
<div className={`bg-gradient-to-br ${project.gradient}`} /> // ❌ purgada
```

**b) Usa tablas de consulta con las clases escritas literalmente.** Así aparecen
en el código fuente y Tailwind las genera.

### 5.2 `lib/cms/presentation.ts`

```ts
import type { Accent, ServiceLayout } from "./types";

/** Clases literales para que Tailwind las detecte al escanear este archivo. */
export const ACCENT_TEXT: Record<Accent, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  neutral: "text-black",
};

export const ACCENT_BADGE: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  tertiary: "bg-tertiary/10 text-tertiary",
  neutral: "bg-neutral text-black",
};

export const ACCENT_HOVER_BORDER: Record<Accent, string> = {
  primary: "hover:border-primary/40",
  secondary: "hover:border-secondary/40",
  tertiary: "hover:border-tertiary/40",
  neutral: "hover:border-neutral",
};

export const ACCENT_STEP: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  tertiary: "bg-tertiary/10 text-tertiary border-tertiary/20",
  neutral: "bg-neutral text-black border-neutral",
};

export const LAYOUT: Record<ServiceLayout, string> = {
  standard: "",
  wide: "md:col-span-2 flex flex-col justify-between",
  centered: "flex flex-col justify-center items-center text-center",
};

/**
 * Los degradados se guardan en el CMS como la cadena completa de clases. La
 * tabla parece redundante, pero es lo que hace que los literales existan en el
 * código fuente para que Tailwind los compile. Si el CMS trae un valor que no
 * está aquí, se usa el de reserva.
 */
export const PROJECT_GRADIENT: Record<string, string> = {
  "from-primary/20 via-primary/5 to-transparent": "from-primary/20 via-primary/5 to-transparent",
  "from-secondary/20 via-secondary/5 to-transparent": "from-secondary/20 via-secondary/5 to-transparent",
  "from-tertiary/20 via-tertiary/5 to-transparent": "from-tertiary/20 via-tertiary/5 to-transparent",
  "from-primary/20 via-tertiary/5 to-transparent": "from-primary/20 via-tertiary/5 to-transparent",
  "from-secondary/20 via-primary/5 to-transparent": "from-secondary/20 via-primary/5 to-transparent",
  "from-tertiary/20 via-secondary/5 to-transparent": "from-tertiary/20 via-secondary/5 to-transparent",
};

export const FALLBACK_GRADIENT = "from-primary/20 via-primary/5 to-transparent";

export function gradientFor(value: string | null): string {
  return (value && PROJECT_GRADIENT[value]) || FALLBACK_GRADIENT;
}
```

Si prefieres no mantener esa tabla, la alternativa es declarar los literales en
`app/globals.css` con `@source inline(...)` de Tailwind v4. Elige una de las dos,
pero no dejes las clases sin declarar en ningún sitio.

### 5.3 Registro de iconos — `components/icons.tsx`

El CMS guarda **claves** de icono; el SVG vive en el frontend. Antes de refactorizar,
extrae los `<path d="…">` de los componentes actuales (todavía están ahí) y
móntalos en un registro.

Claves que el contenido sembrado usa hoy:

| Clave | Dónde aparece | De qué componente sacar el `path` |
| --- | --- | --- |
| `window` | service `aplicaciones-web` | `DevelopmentServices.tsx`, tarjeta 1 |
| `cloud` | service `arquitectura-cloud-backend`, project `cloud-anchor` | `DevelopmentServices.tsx`, tarjeta 2 |
| `mobile` | service `desarrollo-movil…`, project `omnipay-mobile` | `DevelopmentServices.tsx`, tarjeta 3 |
| `refresh` | service `devsecops` | `DevelopmentServices.tsx`, tarjeta 4 |
| `search` | service `auditorias-seguridad-pentesting` | `SecurityServices.tsx`, tarjeta 1 |
| `radar` | service `monitoreo-continuo` | `SecurityServices.tsx`, tarjeta 2 |
| `lock` | service `proteccion-datos-cifrado`, project `vita-vault` | `SecurityServices.tsx`, tarjeta 3 |
| `alert` | service `respuesta-incidentes` | `SecurityServices.tsx`, tarjeta 4 |
| `code` | `softwareHero.panelIcon` | `ServicesTabs.tsx`, pestaña 1 |
| `shield` | `securityHero.panelIcon`, project `apex-nexus` | `ServicesTabs.tsx`, pestaña 2 |
| `analytics` | project `sentinel-wall` | `ProjectsGrid` no lo pinta — ver nota |
| `chart` | project `datapulse-analytics` | idem |

```tsx
// components/icons.tsx
import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  code: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  // … completar con el resto extrayéndolos de los componentes actuales
};

export function Icon({ name, ...props }: { name: string | null } & SVGProps<SVGSVGElement>) {
  const d = name ? PATHS[name] : undefined;
  if (!d) return null; // clave desconocida o nula → no se pinta nada
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
```

> **Nota sobre `project.icon`:** el diseño actual de `ProjectsGrid` **no
> renderiza ningún icono** — la cabecera muestra categoría, título y métrica. El
> campo existe en el CMS pero hoy no se usa. No inventes un sitio donde ponerlo;
> déjalo sin consumir o consúltalo con el responsable del diseño.

---

## 6. Orden de implementación

Sigue este orden: cada fase deja el sitio funcionando y verificable.

### Fase 1 — Infraestructura
1. `.env.local` con `NEXT_PUBLIC_CMS_URL`.
2. `lib/cms/types.ts`, `lib/cms/client.ts`, `lib/cms/queries.ts`,
   `lib/cms/presentation.ts`, `components/icons.tsx`.
3. **Verificar**: `pnpm build` sigue pasando (nada consume aún la capa nueva).

### Fase 2 — Layout (`global`)
4. `Navbar.tsx` es `"use client"` por el indicador animado. **No lo conviertas en
   server component.** Extrae el fetch al layout o a un server component padre y
   pásale `navLinks` y `logo` como props.
5. `Footer.tsx` es server component: puede llamar a `getGlobal()` directamente.
   Agrupa `footerLinks` por `group` y ordena por `order`:

```tsx
const groups = { servicios: "Servicios", empresa: "Empresa", legal: "Legal" } as const;
const byGroup = (g: keyof typeof groups) =>
  global.footerLinks.filter((l) => l.group === g).sort((a, b) => a.order - b.order);
```
6. `© {currentYear}` se sigue calculando en código.
7. **Verificar**: navbar y footer renderizan desde el CMS en `/`.

### Fase 3 — Home
8. `Hero.tsx` ← `homePage.hero`. Sustituye `ButtonGeneric` por un `Link` si el
   CTA debe navegar (hoy es un `<button>` sin acción).
9. `AboutUs.tsx` ← `homePage.about` (incluidas las 2 `stats`).
10. `OurClients.tsx` ← `homePage.clientsHeading` + `getClients()`.
11. **Verificar**: `/` idéntica a antes.

### Fase 4 — Servicios
12. `ServicesTabs.tsx` es `"use client"` (usa `useSyncExternalStore` para el
    hash). Mantén el cliente y **pásale los datos ya resueltos como props** desde
    `app/servicios/page.tsx`, que sí es server component.
13. `SoftwareServices.tsx` ← `softwareHero`; `DevelopmentServices.tsx` ←
    `softwareHeading` + `getServices("software")`; `DevelopmentMethodology.tsx` ←
    `methodologyHeading` + `getMethodologySteps("development")`.
14. `SecurityServices.tsx` ← `securityHero`, `getCertifications()`,
    `getServices("security")`, `securityHeading`, `securityLifecycleHeading`,
    `getMethodologySteps("security")`.
15. El CTA inferior de `app/servicios/page.tsx` ← `servicesPage.cta`.
16. **Verificar**: `/servicios#cloud` sigue haciendo scroll a la tarjeta correcta
    — el `id` sale ahora de `service.anchor`, y si es `null` no habrá ancla.

### Fase 5 — Proyectos
17. `ProjectsGrid.tsx` ← `getProjects()`. Usa `gradientFor(project.gradient)`.
18. Cabecera y métricas de `app/proyectos/page.tsx` ← `projectsPage`.
19. **Verificar**: 6 tarjetas, degradados visibles (si se ven planos, revisa §5.1).

### Fase 6 — Seguridad y legales
20. `app/seguridad/page.tsx` ← `getSecurityPage()`: `heading`, `pillars` (mapea a
    la retícula de 3 columnas), `cta`.
21. `app/privacidad` y `app/terminos` ← `getLegalPage("privacidad" | "terminos")`.
    Requieren renderizador markdown (§7.3). Si `getLegalPage` devuelve `null`,
    llama a `notFound()`.

### Fase 7 — Contacto
22. Ver §7 completo.

### Fase 8 — Metadata
23. Ver §8.

---

## 7. Casos que necesitan una decisión

### 7.1 ⚠️ El formulario debe enviarse desde el NAVEGADOR, no por Server Action

El CMS limita a **5 envíos por IP cada 10 minutos**, leyendo `ctx.request.ip`.

Si el POST sale de una Server Action, Strapi ve **la IP del servidor Next**, no
la del visitante: tras 5 envíos en total, el formulario queda bloqueado **para
todo el mundo** durante 10 minutos.

**Haz el POST desde el componente cliente**, directo a `NEXT_PUBLIC_CMS_URL`. El
CORS del CMS ya lo permite (`CORS_ORIGINS`, `http://localhost:3000`).

> Si por algún motivo se decidiera usar una Server Action, habría que (a) reenviar
> la IP real en `X-Forwarded-For` y (b) activar la confianza de proxy en
> `cms-itcServices/config/server.ts` para que Koa la lea. **Verifica la clave
> exacta en la documentación de Strapi 5 antes de implementarlo**: no está
> confirmada en este repo.

### 7.2 `ContactForm.tsx` — cambios concretos

Hoy simula el envío con un `setTimeout`. Sustitúyelo por:

```tsx
const res = await fetch(`${process.env.NEXT_PUBLIC_CMS_URL}/api/contact-submissions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    data: {
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
      source: "/contacto",
      website: formData.website, // honeypot: SIEMPRE vacío
    },
  }),
});
```

Requisitos:

- **Añade el campo honeypot `website`**: un `<input>` oculto para el usuario
  (fuera de pantalla, `tabIndex={-1}`, `autoComplete="off"`) y **no** con
  `type="hidden"`, para que los bots lo rellenen. Si llega con valor, el CMS
  responde `200` sin guardar nada.
- **Maneja los tres estados de error**, hoy inexistentes:
  | Código | Significado | Qué mostrar |
  | --- | --- | --- |
  | `201` | Guardado | Pantalla de éxito |
  | `200` | Honeypot activado | Pantalla de éxito (no reveles la detección) |
  | `400` | Validación | `error.message` del cuerpo, es legible en español |
  | `429` | Límite de envíos | El mensaje del cuerpo |
  | red / 5xx | CMS caído | Mensaje genérico + no borres lo que escribió |
- Las opciones del `select` salen de `contactPage.inquiryOptions`; el valor
  inicial es el que tenga `isDefault: true`.
- `successTitle` y `successMessage` salen del CMS.
- **Labels y placeholders siguen en código**, tal como está hoy.

### 7.3 Markdown

Dos contenidos distintos, no los trates igual:

- **`homePage.about.body`**: texto plano, dos párrafos separados por `\n\n`, sin
  marcas. Basta con `body.split("\n\n").map(p => <p key={p}>{p}</p>)`. **No
  añadas dependencias por esto.**
- **`legalPage.content`**: markdown de verdad — `##`, `**negrita**`, listas `-` y
  enlaces `[texto](/ruta)`. Necesita renderizador.

Recomendación: `pnpm add react-markdown`. Es una dependencia nueva; confírmalo
antes de instalarla. Aplica las clases del diseño actual vía la prop
`components`, respetando la regla de `text-black`.

> **Prohibido `dangerouslySetInnerHTML`** con contenido del CMS.

### 7.4 Imágenes

Hoy **todos los campos media están vacíos** (`logo: null`, `hero.image: null`,
`client.logo: null`, `project.cover: null`). El logo se sigue sirviendo desde
`public/logo-principal.svg` vía `lib/seo.ts`.

Escribe el código tolerando `null` y cayendo al recurso local. Cuando se suban
imágenes al CMS harán falta dos cosas:

1. Strapi devuelve URLs **relativas** (`/uploads/foo.png`): hay que prefijarlas
   con `NEXT_PUBLIC_CMS_URL`.
2. `next.config.ts` necesita `images.remotePatterns` con el host del CMS, o
   `next/image` rechazará la URL.

---

## 8. Metadata y SEO

El CMS solo cubre `metaTitle`, `metaDescription`, `keywords` y `canonicalURL`.
`openGraph`, `twitter`, `robots`, `icons` y `viewport` **siguen viniendo de
`lib/seo.ts`**. No borres ese archivo: fusiona.

```ts
// lib/cms/metadata.ts
import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import type { CmsSeo } from "./types";

export function buildMetadata(cms: CmsSeo | null, canonicalFallback: string): Metadata {
  const title = cms?.metaTitle ?? seo.title.default;
  const description = cms?.metaDescription ?? seo.description;
  const canonical = cms?.canonicalURL ?? canonicalFallback;

  return {
    title,
    description,
    // El CMS guarda las keywords como una cadena separada por comas.
    keywords: cms?.keywords?.split(",").map((k) => k.trim()).filter(Boolean) ?? seo.keywords,
    alternates: { canonical },
    openGraph: { ...seo.openGraph, title, description, url: `${seo.siteUrl}${canonical}` },
    twitter: { ...seo.twitter, title, description },
  };
}
```

Y en cada página — **fíjate en la directiva**, es obligatoria porque hace fetch:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services-page");
  const page = await getServicesPage();
  return buildMetadata(page?.seo ?? null, "/servicios");
}
```

`app/layout.tsx` usa `metadataBase: new URL(seo.siteUrl)`, y `seo.siteUrl` sigue
siendo `https://example.com` (hay un `TODO` en el archivo). El CMS tiene
`global.siteUrl` con el mismo placeholder. **Cambiar el dominio real es una tarea
aparte**; no la resuelvas por tu cuenta, pero deja el código leyendo de un solo
sitio.

---

## 9. Revalidación bajo demanda (opcional, fase final)

Con `cacheLife('hourly')` un cambio publicado en el CMS tarda hasta una hora en
verse. Para que sea inmediato, añade un route handler y un webhook de Strapi.

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  revalidateTag("cms"); // todas las consultas llevan también este tag
  return Response.json({ revalidated: true, now: Date.now() });
}
```

Configura el webhook en el panel de Strapi (Settings → Webhooks) apuntando a
`/api/revalidate` con la cabecera del secreto, en los eventos de publicación y
actualización de entradas.

---

## 10. Verificación

Ejecuta **con el CMS levantado** (`cd cms-itcServices && pnpm develop`):

```bash
cd frontend && pnpm lint && pnpm build
```

Comprobaciones manuales, en este orden:

| # | Qué | Cómo se comprueba |
| --- | --- | --- |
| 1 | Navbar y footer desde CMS | 3 enlaces de nav; footer con 4/5/3 enlaces por columna |
| 2 | Home | Hero, "Quiénes Somos" con 2 párrafos y 2 cifras, 6 clientes |
| 3 | Servicios / software | 4 tarjetas: 3 features ✓, badge "Escala Empresarial", 4 tags, tarjeta centrada |
| 4 | Servicios / seguridad | 5 certificaciones, 4 tarjetas, 4 pasos del ciclo |
| 5 | Anclas del footer | `/servicios#web`, `#cloud`, `#mobile`, `#devsecops` hacen scroll |
| 6 | Proyectos | 6 tarjetas **con degradado visible** (si están planas → §5.1) |
| 7 | Seguridad | 3 pilares en retícula, con sus colores distintos |
| 8 | Legales | `/privacidad` y `/terminos` con negritas, listas y enlaces renderizados |
| 9 | Formulario OK | Envía → 201 → pantalla de éxito. Comprueba la fila en el panel del CMS |
| 10 | Formulario con email inválido | Muestra el mensaje del CMS, no un error genérico |
| 11 | Rate limit | 6 envíos seguidos → el 6º muestra el mensaje de "demasiados mensajes" |
| 12 | Borrador invisible | Crea un servicio en el panel **sin publicar** → no aparece en `/servicios` |
| 13 | Publicado visible | Púlsalo → aparece **al final** de la lista (`order` nace en 100) |
| 14 | CMS caído | Para Strapi y ejecuta `pnpm build` → debe **fallar con `CmsError`**, no generar páginas vacías |

---

## 11. Trampas conocidas

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Build falla: "uncached data" | `fetch` fuera de un ámbito `use cache` | Envuelve en una función con `"use cache"` |
| Build falla: `next-request-in-use-cache` | `cookies()`/`headers()` dentro de `use cache` | Léelos fuera y pásalos como argumento |
| Build cuelga y expira | Se pasó `params`/`searchParams` a un ámbito cacheado | Pasa solo valores serializables |
| Degradados y acentos invisibles | Clases interpoladas o solo presentes en la BD | Tablas de consulta con literales (§5.2) |
| `400 Bad Request` del CMS | `strictParams: true` + parámetro inventado, o `qs` codificando corchetes | `encodeValuesOnly: true` y solo parámetros válidos |
| Solo salen 25 filas | `defaultLimit` de Strapi | `pagination[pageSize]=100` |
| Faltan filas y no hay error | La colección superó 100 y Strapi recortó en silencio | Paginar leyendo `meta.pagination.pageCount` |
| `ui.cta` sin `primaryLink` | Se envió un `populate` propio que pisó el del CMS | No mandes `populate`; el CMS ya lo resuelve |
| Single type responde 404 | Nunca se publicó | `cmsFetch` devuelve `null`; usa `notFound()` o un fallback |
| Formulario bloqueado para todos | POST vía Server Action → una sola IP | POST desde el navegador (§7.1) |
| Cambio publicado no se ve | `cacheLife('hourly')` | Espera, o monta la revalidación (§9) |
| Endpoint borrado sigue respondiendo | `dist/` conserva el módulo compilado | En el CMS: `rm -rf dist && pnpm build` |

---

## 12. Fuera de alcance

No lo abordes en esta tarea:

- Subir imágenes al CMS y configurar `images.remotePatterns`.
- Sustituir `https://example.com` por el dominio real (`lib/seo.ts` y
  `global.siteUrl`).
- Llevar al CMS los labels y placeholders del formulario.
- Llevar al CMS el cromo decorativo (paneles de radar, mockup de terminal, etc.).
- Página de detalle por proyecto o por servicio (los campos `body` y `slug` ya
  existen en el CMS preparados para ello, pero no hay ruta).
