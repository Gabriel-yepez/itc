import { AxiosError, isAxiosError, isCancel } from 'axios'

export type TipoErrorApi = 'http' | 'red' | 'tiempo_agotado' | 'cancelada' | 'desconocido'

export interface ErrorValidacion {
  /** Ruta del campo inválido, p. ej. "transacciones.3.monto". */
  campo: string
  mensaje: string
}

/**
 * Único tipo de error que expone la capa `api`: la UI nunca maneja errores crudos de axios
 * (que incluyen la configuración de la petición, cabeceras, etc.).
 */
export class ErrorApi extends Error {
  readonly tipo: TipoErrorApi
  /** Código HTTP, o null si no hubo respuesta (red caída, timeout, cancelación). */
  readonly estado: number | null
  readonly validaciones: readonly ErrorValidacion[]

  constructor(tipo: TipoErrorApi, estado: number | null, mensaje: string, validaciones: ErrorValidacion[] = []) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.tipo = tipo
    this.estado = estado
    this.validaciones = validaciones
  }

  get noAutenticado(): boolean {
    return this.estado === 401
  }

  get sinPermiso(): boolean {
    return this.estado === 403
  }
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: 'La solicitud no es válida.',
  401: 'Su sesión no es válida o expiró. Inicie sesión nuevamente.',
  403: 'No tiene permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con datos existentes.',
  413: 'El archivo enviado es demasiado grande.',
  422: 'Hay datos inválidos en la solicitud.',
  423: 'La cuenta está bloqueada temporalmente.',
  429: 'Demasiadas solicitudes. Intente más tarde.',
}

interface DetalleFastApi {
  loc?: (string | number)[]
  msg?: string
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

/** FastAPI responde `{detail: "mensaje"}` o, en validaciones, `{detail: [{loc, msg}, ...]}`. */
function leerDetalle(cuerpo: unknown): { mensaje?: string; validaciones: ErrorValidacion[] } {
  if (!esObjeto(cuerpo)) return { validaciones: [] }
  const { detail } = cuerpo
  if (typeof detail === 'string') return { mensaje: detail, validaciones: [] }
  if (!Array.isArray(detail)) return { validaciones: [] }

  const validaciones = detail.filter(esObjeto).map((d: DetalleFastApi) => ({
    // Se omite el primer elemento ("body", "query"...) que no aporta al usuario.
    campo: (d.loc ?? []).filter((p, i) => !(i === 0 && ['body', 'query', 'path'].includes(String(p)))).join('.'),
    mensaje: d.msg ?? 'Valor inválido',
  }))
  return { validaciones }
}

export function normalizarError(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error
  if (isCancel(error)) return new ErrorApi('cancelada', null, 'La solicitud fue cancelada.')
  if (!isAxiosError(error)) {
    return new ErrorApi('desconocido', null, 'Ocurrió un error inesperado.')
  }

  if (error.response) {
    const estado = error.response.status
    const { mensaje, validaciones } = leerDetalle(error.response.data)
    const texto =
      mensaje ??
      MENSAJES_POR_ESTADO[estado] ??
      (estado >= 500 ? 'El servidor tuvo un problema. Intente más tarde.' : 'La solicitud falló.')
    return new ErrorApi('http', estado, texto, validaciones)
  }

  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ErrorApi('tiempo_agotado', null, 'El servidor tardó demasiado en responder.')
  }
  return new ErrorApi('red', null, 'No se pudo conectar con el servidor. Verifique su conexión.')
}
