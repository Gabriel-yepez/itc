import axios, { type AxiosInstance } from 'axios'

import { CONFIG_API, type ConfigApi } from './config'

/**
 * Instancia de axios con opciones seguras. Solo usa opciones nativas de axios, sin interceptores
 * que manipulen cabeceras ni tokens a mano.
 */
export function crearClienteHttp(config: ConfigApi = CONFIG_API): AxiosInstance {
  return axios.create({
    baseURL: config.urlBase,
    // Cualquier ruta se concatena SIEMPRE a baseURL: aunque llegue "https://otro-sitio",
    // la petición no sale de nuestra API (cookies y token CSRF nunca viajan a terceros).
    allowAbsoluteUrls: false,
    // Envía la cookie de sesión HttpOnly (necesario si la API está en otro origen).
    withCredentials: true,
    timeout: config.tiempoEsperaMs,
    responseType: 'json',
    headers: { Accept: 'application/json' },
    // CSRF nativo de axios: copia la cookie `csrf_token` a la cabecera `X-CSRF-Token`.
    // Por defecto axios solo lo hace en peticiones al mismo origen. Si la API está en otro
    // origen se habilita explícitamente: es seguro porque allowAbsoluteUrls=false garantiza
    // que todas las peticiones de esta instancia van a nuestra API.
    xsrfCookieName: config.cookieCsrf,
    xsrfHeaderName: config.cabeceraCsrf,
    ...(config.apiEnOtroOrigen ? { withXSRFToken: true } : {}),
  })
}

/** Instancia compartida por todos los servicios de la aplicación. */
export const clienteHttp = crearClienteHttp()
