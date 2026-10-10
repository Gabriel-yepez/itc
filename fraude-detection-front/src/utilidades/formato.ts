import type { Decimal, Moneda } from '../api'

const LOCALE = 'es-VE'

const formateadores = new Map<string, Intl.NumberFormat>()

function numero(min: number, max: number): Intl.NumberFormat {
  const clave = `${min}-${max}`
  let f = formateadores.get(clave)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max })
    formateadores.set(clave, f)
  }
  return f
}

export const entero = (n: number): string => numero(0, 0).format(n)

export const decimal = (n: number, digitos = 2): string => numero(digitos, digitos).format(n)

export const porcentaje = (proporcion: number, digitos = 1): string =>
  `${numero(digitos, digitos).format(proporcion * 100)} %`

export const SIMBOLO_MONEDA: Record<Moneda, string> = { VES: 'Bs.', USD: 'US$' }

export function monto(valor: Decimal | number | null, moneda: Moneda): string {
  if (valor === null) return '—'
  return `${SIMBOLO_MONEDA[moneda]} ${decimal(Number(valor), 2)}`
}

export function valorP(p: number): string {
  return p < 0.0001 ? '< 0,0001' : decimal(p, 4)
}

const fechaHoraFmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
export const fechaHora = (iso: string): string => fechaHoraFmt.format(new Date(iso))

export function tamanoArchivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${decimal(bytes / 1024, 1)} KB`
  return `${decimal(bytes / (1024 * 1024), 1)} MB`
}

/** Número de expediente con ceros a la izquierda: 42 -> "0042". */
export const numeroExpediente = (id: number): string => String(id).padStart(4, '0')
