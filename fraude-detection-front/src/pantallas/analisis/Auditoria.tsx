import { useCallback, useEffect, useState } from 'react'

import { api, ErrorApi, normalizarError, type EventoAuditoria, type Severidad } from '../../api'
import { Aviso } from '../../componentes/Aviso'
import { SEVERIDAD, tipoEvento } from '../../utilidades/etiquetas'
import { fechaHora } from '../../utilidades/formato'

const POR_PAGINA = 50

const ESTILO_SEVERIDAD: Record<Severidad, string> = {
  info: 'border-linea-fuerte text-tinta-suave',
  advertencia: 'border-ocre text-ocre',
  critica: 'border-sello bg-sello text-papel',
}

/** Registro de seguridad para administradores: quién hizo qué, desde dónde y qué generó alertas. */
export function Auditoria() {
  const [soloAlertas, setSoloAlertas] = useState(false)

  return (
    <section className="animate-aparecer">
      <p className="rotulo">Seguridad</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">Registro de auditoría</h1>
        <div role="tablist" aria-label="Filtro" className="flex border border-tinta text-sm">
          {[
            { valor: false, texto: 'Todo' },
            { valor: true, texto: 'Solo alertas' },
          ].map(({ valor, texto }) => (
            <button
              key={texto}
              type="button"
              role="tab"
              aria-selected={soloAlertas === valor}
              onClick={() => setSoloAlertas(valor)}
              className={`min-h-9 px-3.5 py-1.5 transition-colors ${
                soloAlertas === valor ? 'bg-tinta text-papel' : 'hover:bg-papel-hondo'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-tinta-suave">
        Cada evento queda registrado de forma permanente: la base de datos no permite modificarlo ni
        borrarlo. Las advertencias y los eventos críticos también se envían como alerta.
      </p>
      {/* La clave reinicia la lista (y su paginación) al cambiar el filtro. */}
      <ListaEventos key={String(soloAlertas)} soloAlertas={soloAlertas} />
    </section>
  )
}

function ListaEventos({ soloAlertas }: { soloAlertas: boolean }) {
  const [eventos, setEventos] = useState<EventoAuditoria[] | null>(null)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<ErrorApi | null>(null)

  // La primera página reemplaza (si el efecto se repite, no duplica); las siguientes se agregan.
  const recibir = useCallback((pagina: EventoAuditoria[], agregar: boolean) => {
    setEventos((previos) => (agregar ? [...(previos ?? []), ...pagina] : pagina))
    setHayMas(pagina.length === POR_PAGINA)
  }, [])

  useEffect(() => {
    const control = new AbortController()
    api.auditoria
      .listar({ soloAlertas, limite: POR_PAGINA }, control.signal)
      .then((pagina) => recibir(pagina, false))
      .catch((e: unknown) => {
        const causa = normalizarError(e)
        if (causa.tipo !== 'cancelada') setError(causa)
      })
    return () => control.abort()
  }, [soloAlertas, recibir])

  async function cargarMas() {
    setCargando(true)
    setError(null)
    try {
      const desplazamiento = eventos?.length ?? 0
      recibir(await api.auditoria.listar({ soloAlertas, limite: POR_PAGINA, desplazamiento }), true)
    } catch (e) {
      setError(normalizarError(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mt-6">
          <Aviso titulo="No se pudo cargar el registro">{error.message}</Aviso>
        </div>
      )}

      {eventos === null ? (
        !error && (
          <ul className="mt-8 grid gap-3" aria-busy="true" aria-label="Cargando eventos">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-14 animate-pulse bg-papel-hondo/70" />
            ))}
          </ul>
        )
      ) : eventos.length === 0 ? (
        <p className="mt-10 border-t border-tinta pt-8 text-tinta-suave">
          {soloAlertas ? 'No hay alertas registradas.' : 'Todavía no hay eventos.'}
        </p>
      ) : (
        <ul className="mt-8 border-t border-tinta">
          {eventos.map((evento) => (
            <FilaEvento key={evento.id} evento={evento} />
          ))}
        </ul>
      )}

      {hayMas && (
        <button
          type="button"
          onClick={() => void cargarMas()}
          disabled={cargando}
          className="mt-6 border border-tinta px-4 py-2 text-sm hover:bg-tinta hover:text-papel disabled:opacity-60"
        >
          {cargando ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </>
  )
}

function FilaEvento({ evento }: { evento: EventoAuditoria }) {
  const detalle = Object.entries(evento.detalle)
  return (
    <li className="grid gap-x-5 gap-y-1.5 border-b border-linea py-3.5 sm:grid-cols-[11.5rem_minmax(0,1fr)_auto]">
      <span className="cifra text-xs whitespace-nowrap text-tinta-suave sm:pt-1">{fechaHora(evento.momento)}</span>
      <div className="min-w-0">
        <p className="font-medium">{tipoEvento(evento.tipo)}</p>
        <p className="text-xs text-tinta-suave">
          {evento.nombre_usuario ?? 'anónimo'}
          {evento.ip && <span className="cifra"> · IP {evento.ip}</span>}
        </p>
        {detalle.length > 0 && (
          <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {detalle.map(([clave, valor]) => (
              <div key={clave} className="flex gap-1">
                <dt className="text-tinta-suave">{clave.replaceAll('_', ' ')}:</dt>
                <dd className="cifra break-all">{typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <span
        className={`row-start-1 justify-self-start self-start rounded-xs border px-1.5 py-px font-mono text-[0.65rem] tracking-widest uppercase sm:row-auto sm:justify-self-end ${ESTILO_SEVERIDAD[evento.severidad]}`}
      >
        {SEVERIDAD[evento.severidad]}
      </span>
    </li>
  )
}
