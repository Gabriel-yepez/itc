/**
 * Configuración del cliente HTTP.
 *
 * Por defecto la API se consume en el MISMO origen (`/api`): en desarrollo Vite hace de proxy
 * hacia FastAPI y en producción lo hace el servidor web. Así las cookies son de primer nivel,
 * no hace falta CORS y axios solo envía el token CSRF a nuestro propio origen.
 */

const urlConfigurada = (import.meta.env.VITE_API_URL ?? '').trim() || '/api'
const urlBase = urlConfigurada.replace(/\/+$/, '')

const origenApi = new URL(urlBase, window.location.origin)

if (import.meta.env.PROD && origenApi.protocol !== 'https:' && origenApi.hostname !== 'localhost') {
  throw new Error('VITE_API_URL debe usar HTTPS en producción: las cookies de sesión son Secure.')
}

export const CONFIG_API = Object.freeze({
  urlBase,
  /** true si la API vive en otro origen (requiere CORS y cookie_dominio compartido en el backend). */
  apiEnOtroOrigen: origenApi.origin !== window.location.origin,
  tiempoEsperaMs: 30_000,
  /** Las subidas de CSV grandes necesitan más margen. */
  tiempoEsperaArchivosMs: 120_000,
  // Deben coincidir con FRAUDE_COOKIE_CSRF_NOMBRE / FRAUDE_CABECERA_CSRF del backend.
  cookieCsrf: 'csrf_token',
  cabeceraCsrf: 'X-CSRF-Token',
})

export type ConfigApi = typeof CONFIG_API
