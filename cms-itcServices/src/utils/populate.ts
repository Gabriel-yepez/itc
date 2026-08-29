/**
 * Fragmentos de `populate` reutilizables.
 *
 * Strapi no popula componentes ni relaciones por defecto, y `populate=*` solo
 * baja un nivel — insuficiente para componentes anidados como `ui.cta` → `ui.link`.
 * Estos fragmentos se aplican como valores por defecto en los controladores para
 * que el frontend pueda pedir `GET /api/<recurso>` sin construir consultas.
 */

export const SEO = { populate: { shareImage: true } } as const;

export const HERO = {
  populate: { image: true, primaryLink: true, secondaryLink: true },
} as const;

export const CTA = {
  populate: { primaryLink: true, secondaryLink: true },
} as const;

export const ABOUT = {
  populate: { image: true, stats: true },
} as const;

type QueryDefaults = {
  populate?: unknown;
  sort?: unknown;
};

/**
 * Fija `populate`/`sort` por defecto sin pisar lo que pida quien consume la API:
 * si la petición ya trae el parámetro, gana el de la petición.
 */
export function withDefaults(ctx: { query?: unknown }, defaults: QueryDefaults) {
  ctx.query = { ...defaults, ...(ctx.query as Record<string, unknown>) };
}
