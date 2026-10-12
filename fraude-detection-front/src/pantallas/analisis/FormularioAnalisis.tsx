import { useId, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'

import type {
  Canal,
  CriterioAgrupacion,
  FormatoCsv,
  Moneda,
  OpcionesAnalisisCsv,
  PerfilDeteccion,
  SobrescriturasParametros,
  SolicitudAnalisis,
} from '../../api'
import { Aviso } from '../../componentes/Aviso'
import { AGRUPACION, CANAL } from '../../utilidades/etiquetas'
import { entero, tamanoArchivo } from '../../utilidades/formato'
import {
  descargarTexto,
  ejemploManipulado,
  ejemploNatural,
  leerMontos,
  PLANTILLA_CSV,
  type SeparadorDecimal,
} from '../../utilidades/montos'

export type Pedido =
  | { tipo: 'json'; solicitud: SolicitudAnalisis; etiqueta: string }
  | { tipo: 'csv'; archivo: File; opciones: OpcionesAnalisisCsv; etiqueta: string }

type Fuente = 'csv' | 'pegar'

/** Ajustes rápidos sobre el perfil; se guardan como texto tal como los escribe el usuario. */
interface Ajustes {
  moneda_base: Moneda
  tasa_bcv_predeterminada: string
  monto_minimo: string
  tamano_muestra_minimo: string
  agrupar_por: CriterioAgrupacion | ''
}

const MAX_MB = 50
const MAX_TRANSACCIONES = 500_000
const DECIMAL = /^\d+(\.\d+)?$/

const aDecimal = (texto: string): string | null => {
  const limpio = texto.trim().replace(',', '.')
  return DECIMAL.test(limpio) ? limpio : null
}

const estiloControl =
  'w-full min-w-0 border-0 border-b border-linea-fuerte bg-transparent py-2 text-base focus:border-tinta focus:outline-none lg:py-1.5 lg:text-[0.95rem]'

interface Props {
  perfiles: PerfilDeteccion[]
  ejecutando: boolean
  onEnviar: (pedido: Pedido) => void
  onCancelar: () => void
}

export function FormularioAnalisis({ perfiles, ejecutando, onEnviar, onCancelar }: Props) {
  const id = useId()
  const [fuente, setFuente] = useState<Fuente>('csv')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [formato, setFormato] = useState<Required<Omit<FormatoCsv, 'columnas' | 'codificacion'>>>({
    delimitador: ';',
    separador_decimal: ',',
    formato_fecha: '%d/%m/%Y',
    omitir_filas_invalidas: false,
  })
  const [texto, setTexto] = useState('')
  const [separador, setSeparador] = useState<SeparadorDecimal>(',')
  const [moneda, setMoneda] = useState<Moneda>('VES')
  const [canal, setCanal] = useState<Canal>('otro')
  const [perfilId, setPerfilId] = useState<number | null>(null)
  const [cambios, setCambios] = useState<Partial<Ajustes>>({})
  const [descripcion, setDescripcion] = useState('')
  const [guardar, setGuardar] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const perfil = perfiles.find((p) => p.id === perfilId) ?? perfiles.find((p) => p.predeterminado) ?? perfiles[0]
  const lectura = leerMontos(texto, separador)

  const base: Ajustes | null = perfil
    ? {
        moneda_base: perfil.parametros.moneda_base,
        tasa_bcv_predeterminada: perfil.parametros.tasa_bcv_predeterminada ?? '',
        monto_minimo: perfil.parametros.monto_minimo,
        tamano_muestra_minimo: String(perfil.parametros.tamano_muestra_minimo),
        agrupar_por: perfil.parametros.agrupar_por ?? '',
      }
    : null
  const ajuste = <K extends keyof Ajustes>(clave: K): Ajustes[K] | '' => cambios[clave] ?? base?.[clave] ?? ''
  const cambiar = <K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) => setCambios((c) => ({ ...c, [clave]: valor }))

  function elegirPerfil(valor: string) {
    setPerfilId(Number(valor))
    setCambios({}) // los ajustes rápidos se recalculan desde el nuevo perfil
  }

  function elegirArchivo(nuevo: File | undefined) {
    setError(null)
    if (!nuevo) return
    if (!/\.(csv|txt)$/i.test(nuevo.name)) {
      setError('El archivo debe ser un CSV (.csv o .txt).')
      return
    }
    if (nuevo.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera el máximo de ${MAX_MB} MB.`)
      return
    }
    setArchivo(nuevo)
  }

  function soltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault()
    setArrastrando(false)
    elegirArchivo(evento.dataTransfer.files[0])
  }

  /** Solo se envían los ajustes que difieren del perfil. */
  function sobrescrituras(): SobrescriturasParametros | string {
    const resultado: SobrescriturasParametros = {}
    if (!base) return resultado
    for (const clave of Object.keys(cambios) as (keyof Ajustes)[]) {
      const valor = cambios[clave]
      if (valor === undefined || valor === base[clave]) continue
      switch (clave) {
        case 'moneda_base':
          resultado.moneda_base = valor as Moneda
          break
        case 'agrupar_por':
          resultado.agrupar_por = (valor || null) as CriterioAgrupacion | null
          break
        case 'tamano_muestra_minimo': {
          const n = Number(valor)
          if (!Number.isInteger(n) || n < 30) return 'El tamaño mínimo de muestra debe ser un entero mayor o igual a 30.'
          resultado.tamano_muestra_minimo = n
          break
        }
        case 'tasa_bcv_predeterminada': {
          if (valor === '') {
            resultado.tasa_bcv_predeterminada = null
            break
          }
          const tasa = aDecimal(valor)
          if (!tasa || Number(tasa) <= 0) return 'La tasa BCV debe ser un número mayor que 0 (p. ej. 36,50).'
          resultado.tasa_bcv_predeterminada = tasa
          break
        }
        case 'monto_minimo': {
          const minimo = aDecimal(valor)
          if (!minimo) return 'El monto mínimo debe ser un número (p. ej. 10 o 10,50).'
          resultado.monto_minimo = minimo
          break
        }
      }
    }
    return resultado
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ejecutando) return
    setError(null)

    const parametros = sobrescrituras()
    if (typeof parametros === 'string') {
      setError(parametros)
      return
    }
    const comunes = {
      parametros: Object.keys(parametros).length ? parametros : undefined,
      descripcion: descripcion.trim() || undefined,
      guardar,
    }

    if (fuente === 'csv') {
      if (!archivo) {
        setError('Seleccione o arrastre un archivo CSV.')
        return
      }
      onEnviar({
        tipo: 'csv',
        archivo,
        etiqueta: `Analizando ${archivo.name}…`,
        opciones: { ...comunes, perfilId: perfil?.id, formato },
      })
      return
    }

    if (lectura.montos.length === 0) {
      setError('Pegue al menos un monto válido, uno por línea.')
      return
    }
    if (lectura.montos.length > MAX_TRANSACCIONES) {
      setError(`Se admiten como máximo ${entero(MAX_TRANSACCIONES)} montos por análisis.`)
      return
    }
    onEnviar({
      tipo: 'json',
      etiqueta: `Analizando ${entero(lectura.montos.length)} montos…`,
      solicitud: {
        ...comunes,
        perfil_id: perfil?.id,
        transacciones: lectura.montos.map((monto) => ({ monto, moneda, canal })),
      },
    })
  }

  return (
    <form onSubmit={enviar} noValidate className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-8 px-5 py-7 sm:px-8 lg:max-w-none lg:px-7 lg:py-8">
      <div>
        <p className="rotulo">Nuevo análisis</p>
        <h2 className="mt-1 font-serif text-[2.1rem] leading-none tracking-tight">Abrir expediente</h2>
      </div>

      {/* ---------------------------------------------------------- 01 · Datos */}
      <Seccion numero="01" titulo="Datos">
        <fieldset className="grid grid-cols-2 border border-tinta">
          <legend className="sr-only">Origen de los datos</legend>
          {(
            [
              ['csv', 'Archivo CSV'],
              ['pegar', 'Pegar montos'],
            ] as const
          ).map(([valor, texto]) => (
            <label
              key={valor}
              className="cursor-pointer py-2.5 text-center text-sm transition-colors has-checked:bg-tinta has-checked:text-papel has-focus-visible:outline-2 has-focus-visible:outline-sello"
            >
              <input
                type="radio"
                name={`${id}-fuente`}
                value={valor}
                checked={fuente === valor}
                onChange={() => {
                  setFuente(valor)
                  setError(null)
                }}
                className="sr-only"
              />
              {texto}
            </label>
          ))}
        </fieldset>

        {fuente === 'csv' ? (
          <div className="grid gap-4">
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setArrastrando(true)
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltar}
              className={`grid cursor-pointer place-items-center gap-1 border border-dashed px-4 py-7 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-sello ${
                arrastrando ? 'border-sello bg-sello/5' : 'border-linea-fuerte hover:border-tinta hover:bg-papel-claro'
              }`}
            >
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => elegirArchivo(e.target.files?.[0])}
              />
              {archivo ? (
                <>
                  <span className="font-serif text-xl break-all">{archivo.name}</span>
                  <span className="cifra text-xs text-tinta-suave">{tamanoArchivo(archivo.size)} · clic para cambiar</span>
                </>
              ) : (
                <>
                  <span className="font-serif text-xl">
                    <span className="hidden lg:inline">Arrastre el extracto aquí</span>
                    <span className="lg:hidden">Toque para elegir el extracto</span>
                  </span>
                  <span className="text-xs text-tinta-suave">
                    <span className="hidden lg:inline">o haga clic para buscarlo · </span>CSV hasta {MAX_MB} MB
                  </span>
                </>
              )}
            </label>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-[1.25fr_1fr_1fr] sm:gap-3 lg:grid-cols-2">
              <Campo etiqueta="Separador" className="col-span-2 sm:col-span-1 lg:col-span-2">
                <select
                  value={formato.delimitador}
                  onChange={(e) => setFormato({ ...formato, delimitador: e.target.value as typeof formato.delimitador })}
                  className={estiloControl}
                >
                  <option value=";">Punto y coma</option>
                  <option value=",">Coma</option>
                  <option value={'\t'}>Tabulador</option>
                  <option value="|">Barra</option>
                </select>
              </Campo>
              <Campo etiqueta="Decimales">
                <select
                  value={formato.separador_decimal}
                  onChange={(e) =>
                    setFormato({ ...formato, separador_decimal: e.target.value as SeparadorDecimal })
                  }
                  className={estiloControl}
                >
                  <option value=",">1.234,56</option>
                  <option value=".">1,234.56</option>
                </select>
              </Campo>
              <Campo etiqueta="Fechas">
                <select
                  value={formato.formato_fecha}
                  onChange={(e) => setFormato({ ...formato, formato_fecha: e.target.value })}
                  className={estiloControl}
                >
                  <option value="%d/%m/%Y">dd/mm/aaaa</option>
                  <option value="%Y-%m-%d">aaaa-mm-dd</option>
                  <option value="%d-%m-%Y">dd-mm-aaaa</option>
                </select>
              </Campo>
            </div>

            <Casilla
              marcada={formato.omitir_filas_invalidas}
              onCambio={(v) => setFormato({ ...formato, omitir_filas_invalidas: v })}
            >
              Omitir filas inválidas en lugar de detener el análisis
            </Casilla>

            <p className="text-xs leading-relaxed text-tinta-suave">
              Columna obligatoria: <code className="cifra text-tinta">monto</code>. Opcionales: fecha, moneda, canal,
              tipo, cuenta, tasa_bcv.{' '}
              <button
                type="button"
                onClick={() => descargarTexto('plantilla_transacciones.csv', PLANTILLA_CSV)}
                className="font-medium text-tinta underline underline-offset-4 hover:text-sello"
              >
                Descargar plantilla
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <Campo etiqueta="Montos, uno por línea">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={9}
                spellCheck={false}
                placeholder={separador === ',' ? '1.520,75\n48,00\n12.300,00' : '1,520.75\n48.00\n12,300.00'}
                className="cifra mt-1 w-full resize-y border border-linea-fuerte bg-papel-claro/70 p-2.5 text-sm focus:border-tinta focus:outline-none"
              />
            </Campo>
            <p className="cifra text-xs text-tinta-suave" aria-live="polite">
              {entero(lectura.montos.length)} montos válidos
              {lectura.lineasInvalidas > 0 && (
                <span className="text-sello"> · {entero(lectura.lineasInvalidas)} líneas ignoradas</span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Campo etiqueta="Decimales">
                <select
                  value={separador}
                  onChange={(e) => setSeparador(e.target.value as SeparadorDecimal)}
                  className={estiloControl}
                >
                  <option value=",">1.234,56</option>
                  <option value=".">1,234.56</option>
                </select>
              </Campo>
              <Campo etiqueta="Moneda">
                <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} className={estiloControl}>
                  <option value="VES">Bolívares</option>
                  <option value="USD">Dólares</option>
                </select>
              </Campo>
              <Campo etiqueta="Canal">
                <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} className={estiloControl}>
                  {Object.entries(CANAL).map(([valor, nombre]) => (
                    <option key={valor} value={valor}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-suave">
              <span>Practicar con:</span>
              <button
                type="button"
                onClick={() => setTexto(ejemploNatural(separador))}
                className="font-medium text-tinta underline underline-offset-4 hover:text-conforme"
              >
                datos naturales
              </button>
              <button
                type="button"
                onClick={() => setTexto(ejemploManipulado(separador))}
                className="font-medium text-tinta underline underline-offset-4 hover:text-sello"
              >
                datos manipulados
              </button>
            </div>
          </div>
        )}
      </Seccion>

      {/* ---------------------------------------------------------- 02 · Perfil */}
      <Seccion numero="02" titulo="Perfil de detección">
        {perfil ? (
          <>
            <select
              aria-label="Perfil de detección"
              value={perfil.id}
              onChange={(e) => elegirPerfil(e.target.value)}
              className={`${estiloControl} text-base`}
            >
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {(perfil.predeterminado || perfil.descripcion) && (
              <p className="text-xs leading-relaxed text-tinta-suave">
                {perfil.predeterminado && <span className="rotulo mr-1.5 text-[0.6rem] text-conforme">Predeterminado</span>}
                {perfil.descripcion}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-tinta-suave">Cargando perfiles…</p>
        )}

        <details className="group border-t border-linea pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
            Ajustes para este análisis
            <span className="font-mono text-tinta-suave transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <Campo etiqueta="Moneda base">
              <select
                value={ajuste('moneda_base')}
                onChange={(e) => cambiar('moneda_base', e.target.value as Moneda)}
                className={estiloControl}
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </Campo>
            <Campo etiqueta="Tasa BCV (Bs/US$)">
              <input
                inputMode="decimal"
                placeholder="36,50"
                value={ajuste('tasa_bcv_predeterminada')}
                onChange={(e) => cambiar('tasa_bcv_predeterminada', e.target.value)}
                className={`${estiloControl} cifra`}
              />
            </Campo>
            <Campo etiqueta="Monto mínimo">
              <input
                inputMode="decimal"
                value={ajuste('monto_minimo')}
                onChange={(e) => cambiar('monto_minimo', e.target.value)}
                className={`${estiloControl} cifra`}
              />
            </Campo>
            <Campo etiqueta="Muestra mínima">
              <input
                type="number"
                min={30}
                step={1}
                value={ajuste('tamano_muestra_minimo')}
                onChange={(e) => cambiar('tamano_muestra_minimo', e.target.value)}
                className={`${estiloControl} cifra`}
              />
            </Campo>
            <div className="col-span-2">
              <Campo etiqueta="Segmentar resultados">
                <select
                  value={ajuste('agrupar_por')}
                  onChange={(e) => cambiar('agrupar_por', e.target.value as CriterioAgrupacion | '')}
                  className={estiloControl}
                >
                  <option value="">Sin segmentar</option>
                  {Object.entries(AGRUPACION).map(([valor, nombre]) => (
                    <option key={valor} value={valor}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>
        </details>
      </Seccion>

      {/* ---------------------------------------------------------- 03 · Registro */}
      <Seccion numero="03" titulo="Registro">
        <Campo etiqueta="Descripción (opcional)">
          <input
            value={descripcion}
            maxLength={255}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Pago Móvil agencia Maracay, marzo"
            className={estiloControl}
          />
        </Campo>
        <Casilla marcada={guardar} onCambio={setGuardar}>
          Guardar en el historial de análisis
        </Casilla>
      </Seccion>

      <div className="mt-auto grid gap-3 pb-2" aria-live="polite">
        {error && <Aviso>{error}</Aviso>}
        <button
          type="submit"
          disabled={ejecutando || !perfil}
          className="group flex w-full items-center justify-between bg-tinta px-5 py-3.5 text-papel transition-colors duration-300 hover:bg-sello disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-tinta"
        >
          <span className="font-medium tracking-wide">{ejecutando ? 'Analizando…' : 'Analizar'}</span>
          <span aria-hidden="true" className="font-mono transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
        {ejecutando && (
          <button type="button" onClick={onCancelar} className="text-sm text-tinta-suave underline underline-offset-4">
            Cancelar análisis
          </button>
        )}
      </div>
    </form>
  )
}

function Seccion({ numero, titulo, children }: { numero: string; titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h3 className="flex items-baseline gap-3 border-b border-tinta pb-1.5">
        <span className="cifra text-xs text-sello">{numero}</span>
        <span className="rotulo text-tinta">{titulo}</span>
      </h3>
      {children}
    </section>
  )
}

function Campo({ etiqueta, className = '', children }: { etiqueta: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="rotulo text-[0.62rem]">{etiqueta}</span>
      {children}
    </label>
  )
}

function Casilla({
  marcada,
  onCambio,
  children,
}: {
  marcada: boolean
  onCambio: (valor: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-0.5 text-sm text-tinta-media">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-tinta"
      />
      {children}
    </label>
  )
}
