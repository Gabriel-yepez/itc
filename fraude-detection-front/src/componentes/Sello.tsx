import type { NivelRiesgo } from '../api'
import { NIVEL, NIVEL_CORTO } from '../utilidades/etiquetas'
import { COLOR_NIVEL } from '../utilidades/clasesNivel'
import { decimal } from '../utilidades/formato'

interface Props {
  nivel: NivelRiesgo
  puntaje: number
}

/** El dictamen del análisis, estampado como un sello de auditoría. */
export function Sello({ nivel, puntaje }: Props) {
  return (
    <div
      role="img"
      aria-label={`${NIVEL[nivel]}, puntaje ${decimal(puntaje, 0)} de 100`}
      className={`relative inline-grid animate-estampar justify-items-center gap-0.5 rounded-md border-[3px] border-double px-6 pt-3.5 pb-3 mix-blend-multiply ${COLOR_NIVEL[nivel]} after:pointer-events-none after:absolute after:-inset-1 after:grano after:bg-size-[90px] after:mix-blend-screen after:content-['']`}
    >
      <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase">Dictamen</span>
      <span className="font-serif text-[2.6rem] leading-[0.95] tracking-wide uppercase">{NIVEL_CORTO[nivel]}</span>
      <span className="text-[1.05rem] font-medium">
        <span className="cifra">{decimal(puntaje, 0)}</span>
        <span className="font-mono text-xs opacity-70">/100</span>
      </span>
    </div>
  )
}

/** Versión compacta para tablas y listas. */
export function EtiquetaNivel({ nivel }: { nivel: NivelRiesgo }) {
  return (
    <span
      className={`inline-block rounded-xs border px-1.5 py-px font-mono text-[0.68rem] font-medium tracking-widest whitespace-nowrap uppercase ${COLOR_NIVEL[nivel]}`}
    >
      {NIVEL_CORTO[nivel]}
    </span>
  )
}
