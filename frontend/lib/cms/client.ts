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
