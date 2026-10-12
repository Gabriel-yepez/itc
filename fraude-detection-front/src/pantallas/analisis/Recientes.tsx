import type { CSSProperties } from 'react'

import type { ResumenAnalisis } from '../../api'
import { EtiquetaNivel } from '../../componentes/Sello'
import { FONDO_NIVEL } from '../../utilidades/clasesNivel'
import { decimal, entero, fechaHora, numeroExpediente } from '../../utilidades/formato'

interface Props {
  recientes: ResumenAnalisis[] | null
  abriendoId: number | null
  onAbrir: (id: number) => void
}

export function Recientes({ recientes, abriendoId, onAbrir }: Props) {
  return (
    <section className="animate-aparecer">
      <p className="rotulo">Archivo</p>
      <h1 className="mt-1 font-serif text-4xl leading-none tracking-tight sm:text-5xl">Análisis recientes</h1>

      {recientes === null ? (
        <ul className="mt-10 grid gap-3" aria-busy="true" aria-label="Cargando análisis">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-16 animate-pulse bg-papel-hondo/70" />
          ))}
        </ul>
      ) : recientes.length === 0 ? (
        <SinAnalisis />
      ) : (
        <ul className="mt-8 border-t border-tinta sm:mt-10">
          {recientes.map((a) => (
            <li key={a.id} className="border-b border-linea">
              <button
                type="button"
                onClick={() => onAbrir(a.id)}
                disabled={abriendoId !== null}
                aria-busy={abriendoId === a.id}
                className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3.5 sm:gap-x-5 sm:py-4 text-left transition-colors hover:bg-papel-claro/70 disabled:cursor-wait sm:grid-cols-[4.5rem_minmax(0,1fr)_7rem_9rem_6rem]"
              >
                <span className="cifra hidden pl-1 text-sm text-tinta-suave group-hover:text-sello sm:block">
                  {numeroExpediente(a.id)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-serif text-lg leading-tight sm:text-xl">
                    {a.descripcion || <span className="text-tinta-suave italic">Sin título</span>}
                  </span>
                  <span className="block text-xs text-tinta-suave">
                    <span className="cifra sm:hidden">N.º {numeroExpediente(a.id)} · </span>
                    {abriendoId === a.id ? 'Abriendo…' : fechaHora(a.creado_en)}
                  </span>
                </span>
                <span className="cifra hidden text-right text-sm text-tinta-suave sm:block">
                  {entero(a.total_transacciones)} op.
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="h-1.5 flex-1 bg-papel-hondo">
                    <span
                      className={`block h-full w-(--ancho) ${FONDO_NIVEL[a.nivel_riesgo]}`}
                      style={{ '--ancho': `${a.puntaje}%` } as CSSProperties}
                    />
                  </span>
                  <span className="cifra w-7 text-right text-sm">{decimal(a.puntaje, 0)}</span>
                </span>
                <span className="justify-self-end pr-1">
                  <EtiquetaNivel nivel={a.nivel_riesgo} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SinAnalisis() {
  const pasos = [
    ['Cargue los datos', 'Suba un extracto CSV o pegue una lista de montos. También puede practicar con los ejemplos.'],
    ['Elija el perfil', 'Define umbrales, moneda, tasa BCV y pruebas. Puede ajustarlos para un análisis puntual.'],
    ['Lea el dictamen', 'Cada análisis recibe un puntaje de 0 a 100, hallazgos explicados y gráficos por dígito.'],
  ]
  return (
    <div className="mt-10 grid gap-10 border-t border-tinta pt-8">
      <p className="max-w-xl text-lg leading-relaxed text-tinta-media">
        Todavía no hay análisis en el archivo. Abra el primer expediente desde «Nuevo análisis».
      </p>
      <ol className="grid gap-8 md:grid-cols-3">
        {pasos.map(([titulo, texto], i) => (
          <li key={titulo} className="grid gap-2">
            <span className="font-serif text-6xl leading-none text-sello">{i + 1}</span>
            <h2 className="font-medium">{titulo}</h2>
            <p className="text-sm leading-relaxed text-tinta-suave">{texto}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
