/** Lectura de montos pegados a mano y datos de ejemplo para practicar. */

export type SeparadorDecimal = ',' | '.'

export interface LecturaMontos {
  /** Montos normalizados con punto decimal ("1234.56"), listos para la API. */
  montos: string[]
  lineasInvalidas: number
}

const SOLO_NUMERO = /^\d+(\.\d+)?$/

/** Interpreta "1.234,56" (formato venezolano) o "1234.56" según el separador elegido. */
export function normalizarMonto(texto: string, separador: SeparadorDecimal): string | null {
  let limpio = texto.trim().replace(/\s|Bs\.?|US\$|\$/gi, '')
  if (!limpio) return null
  limpio = separador === ',' ? limpio.replaceAll('.', '').replace(',', '.') : limpio.replaceAll(',', '')
  if (!SOLO_NUMERO.test(limpio) || Number(limpio) <= 0) return null
  return limpio
}

export function leerMontos(texto: string, separador: SeparadorDecimal): LecturaMontos {
  const montos: string[] = []
  let lineasInvalidas = 0
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim()) continue
    const monto = normalizarMonto(linea, separador)
    if (monto === null) lineasInvalidas++
    else montos.push(monto)
  }
  return { montos, lineasInvalidas }
}

function escribir(valor: number, separador: SeparadorDecimal): string {
  const texto = valor.toFixed(2)
  return separador === ',' ? texto.replace('.', ',') : texto
}

/** Montos log-uniformes en 5 órdenes de magnitud: así se comportan los datos reales (Benford). */
export function ejemploNatural(separador: SeparadorDecimal, cantidad = 1200): string {
  return Array.from({ length: cantidad }, () => escribir(10 ** (1 + Math.random() * 5), separador)).join('\n')
}

/** Montos "inventados": rango estrecho, cifras repetidas y fraccionamiento bajo 10.000. */
export function ejemploManipulado(separador: SeparadorDecimal, cantidad = 1200): string {
  return Array.from({ length: cantidad }, (_, i) => {
    if (i % 6 === 0) return escribir(9_000 + Math.random() * 990, separador)
    if (i % 11 === 0) return escribir(Math.round(Math.random() * 40 + 10) * 100, separador)
    return escribir(4_000 + Math.random() * 5_900, separador)
  }).join('\n')
}

export const PLANTILLA_CSV = [
  'fecha;monto;moneda;canal;tipo;cuenta;tasa_bcv',
  '15/03/2024;1.520,75;VES;pago_movil;debito;cta-001;36,42',
  '15/03/2024;48,00;USD;divisas;credito;cta-002;36,42',
  '16/03/2024;12.300,00;VES;transferencia;debito;cta-001;36,45',
].join('\n')

export function descargarTexto(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  // Se libera después de que el navegador haya iniciado la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
