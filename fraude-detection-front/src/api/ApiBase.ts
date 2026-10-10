import type { AxiosInstance } from 'axios'

import { clienteHttp } from './clienteHttp'
import { normalizarError } from './errores'
import { notificarSesionExpirada } from './sesion'

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ParametrosRuta = Record<string, string | number>
export type ParametrosConsulta = Record<string, string | number | boolean | null | undefined>

export interface OpcionesPeticion {
  /** Cabeceras adicionales. Las de seguridad (CSRF) las pone axios y no se pueden suplantar. */
  headers?: Record<string, string>
  /** Valores para los marcadores de la ruta: `/analisis/:id` + `{ id: 5 }`. Se codifican. */
  parametrosRuta?: ParametrosRuta
  /** Query string (`?limite=50`). axios los codifica; los `undefined` se omiten. */
  params?: ParametrosConsulta
  /** Permite cancelar la petición (p. ej. al desmontar un componente). */
  signal?: AbortSignal
  tiempoEsperaMs?: number
  /** false para no disparar el aviso global de sesión expirada en un 401 (p. ej. en el login). */
  notificarSesionExpirada?: boolean
}

export interface Peticion<B = unknown> extends OpcionesPeticion {
  metodo: MetodoHttp
  /** Ruta relativa a la URL base de la API, p. ej. `/perfiles` o `/analisis/:id`. */
  ruta: string
  body?: B
}

const MARCADOR = /:([A-Za-z_]\w*)/g
const SEGMENTO_PUNTO = /(^|\/)\.{1,2}(\/|$)/

/**
 * Sustituye los marcadores `:nombre` codificando cada valor con encodeURIComponent, para que
 * un valor como "1/../usuarios" no pueda cambiar el endpoint al que se llama.
 */
export function construirRuta(plantilla: string, parametros: ParametrosRuta = {}): string {
  if (!plantilla.startsWith('/') || plantilla.startsWith('//')) {
    throw new Error(`La ruta debe ser relativa a la API y empezar con "/": ${plantilla}`)
  }
  const ruta = plantilla.replace(MARCADOR, (_coincidencia, nombre: string) => {
    const valor = parametros[nombre]
    if (valor === undefined || valor === '') {
      throw new Error(`Falta el parámetro de ruta "${nombre}" en ${plantilla}`)
    }
    return encodeURIComponent(String(valor))
  })
  // Una ruta con "." o ".." dejaría que un valor ("..") apuntara a otro recurso.
  if (SEGMENTO_PUNTO.test(ruta.split('?')[0])) {
    throw new Error(`Ruta no permitida: ${ruta}`)
  }
  return ruta
}

/**
 * Clase base de los servicios de la API.
 *
 * Cada servicio la extiende y expone métodos tipados por endpoint; la instancia de axios se
 * inyecta por el constructor (por defecto la compartida), lo que permite sustituirla en pruebas.
 * Todos los errores salen como `ErrorApi`.
 */
export abstract class ApiBase {
  protected readonly http: AxiosInstance

  constructor(http: AxiosInstance = clienteHttp) {
    this.http = http
  }

  protected async peticion<T, B = unknown>(peticion: Peticion<B>): Promise<T> {
    const { metodo, ruta, body, headers, parametrosRuta, params, signal, tiempoEsperaMs } = peticion
    // Fuera del try: una ruta mal construida es un error de programación, no de la API.
    const url = construirRuta(ruta, parametrosRuta)
    try {
      const respuesta = await this.http.request<T>({
        method: metodo,
        url,
        data: body,
        headers,
        params,
        signal,
        timeout: tiempoEsperaMs,
      })
      return respuesta.data
    } catch (causa) {
      const error = normalizarError(causa)
      if (error.noAutenticado && peticion.notificarSesionExpirada !== false) {
        notificarSesionExpirada()
      }
      throw error
    }
  }

  protected get<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.peticion<T>({ ...opciones, metodo: 'GET', ruta })
  }

  protected post<T, B = unknown>(ruta: string, body?: B, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.peticion<T, B>({ ...opciones, metodo: 'POST', ruta, body })
  }

  protected put<T, B = unknown>(ruta: string, body?: B, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.peticion<T, B>({ ...opciones, metodo: 'PUT', ruta, body })
  }

  protected patch<T, B = unknown>(ruta: string, body?: B, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.peticion<T, B>({ ...opciones, metodo: 'PATCH', ruta, body })
  }

  protected delete<T = void>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.peticion<T>({ ...opciones, metodo: 'DELETE', ruta })
  }
}
