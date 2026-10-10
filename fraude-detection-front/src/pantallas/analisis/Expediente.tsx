import { useState, type CSSProperties, type ReactNode } from 'react'

import type { Analisis, Conformidad, PerfilDeteccion, PruebaBenford, ResultadoPrueba } from '../../api'
import { Aviso } from '../../componentes/Aviso'
import { GraficoDigitos } from '../../componentes/GraficoDigitos'
import { EtiquetaNivel, Sello } from '../../componentes/Sello'
import { FONDO_NIVEL } from '../../utilidades/clasesNivel'
import { AGRUPACION, CANAL, CONFORMIDAD, PRUEBA, motivoExclusion } from '../../utilidades/etiquetas'
import { decimal, entero, fechaHora, monto, numeroExpediente, porcentaje, valorP } from '../../utilidades/formato'

const COLOR_CONFORMIDAD: Record<Conformidad, string> = {
  cercana: 'text-conforme border-conforme',
  aceptable: 'text-conforme border-conforme',
  marginal: 'text-ocre border-ocre',
  no_conformidad: 'text-sello border-sello',
  no_aplica: 'text-tinta-suave border-linea-fuerte',
}

interface Props {
  analisis: Analisis
  perfiles: PerfilDeteccion[]
  onVolver: () => void
}

export function Expediente({ analisis, perfiles, onVolver }: Props) {
  const { resultado: r, parametros } = analisis
  const [pruebaActiva, setPruebaActiva] = useState<PruebaBenford>(r.pruebas[0]?.prueba ?? 'primer_digito')
  const prueba = r.pruebas.find((p) => p.prueba === pruebaActiva) ?? r.pruebas[0]
  const perfil = perfiles.find((p) => p.id === analisis.perfil_id)
  const totalExcluidas = Object.values(r.excluidas).reduce((a, b) => a + b, 0)
  const moneda = r.moneda_base
  // Al segmentar por canal la clave es el código ("pago_movil"): se muestra su nombre.
  const nombreSegmento = (clave: string) =>
    parametros.agrupar_por === 'canal' && clave in CANAL ? CANAL[clave as keyof typeof CANAL] : clave

  return (
    <article className="grid animate-aparecer gap-12">
      {/* ------------------------------------------------------------ encabezado */}
      <header className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onVolver}
            className="mb-5 font-mono text-[0.7rem] tracking-wider text-tinta-suave uppercase hover:text-sello"
          >
            ← Análisis recientes
          </button>
          <p className="rotulo">
            {analisis.id !== null ? `Expediente N.º ${numeroExpediente(analisis.id)}` : 'Análisis sin guardar'} ·{' '}
            {fechaHora(analisis.creado_en)}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-[1.05] tracking-tight break-words sm:text-5xl">
            {analisis.descripcion || <span className="text-tinta-suave italic">Análisis sin título</span>}
          </h1>
          <p className="mt-3 text-sm text-tinta-suave">
            Perfil <span className="text-tinta">{perfil?.nombre ?? 'predeterminado'}</span> · moneda base{' '}
            <span className="text-tinta">{moneda}</span>
            {parametros.agrupar_por && <> · segmentado {AGRUPACION[parametros.agrupar_por].toLowerCase()}</>}
          </p>
        </div>
        <div className="justify-self-start sm:justify-self-end sm:pt-10">
          <Sello nivel={r.nivel_riesgo} puntaje={r.puntaje} />
        </div>
      </header>

      {/* ------------------------------------------------------------ cifras */}
      <dl className="grid grid-cols-2 border-y border-tinta md:grid-cols-5">
        <Cifra etiqueta="Recibidas" valor={entero(r.total_recibidas)} />
        <Cifra etiqueta="Analizadas" valor={entero(r.total_analizadas)} />
        <Cifra etiqueta="Excluidas" valor={entero(totalExcluidas)} />
        <Cifra
          etiqueta="Rango de montos"
          valor={
            r.monto_minimo_observado === null ? (
              '—'
            ) : (
              <span className="block text-base leading-snug">
                <span className="block">{monto(r.monto_minimo_observado, moneda)}</span>
                <span className="block text-tinta-suave">a {monto(r.monto_maximo_observado, moneda)}</span>
              </span>
            )
          }
          ancho
        />
        <Cifra
          etiqueta="Órdenes de magnitud"
          valor={r.ordenes_de_magnitud === null ? '—' : decimal(r.ordenes_de_magnitud, 1)}
        />
      </dl>

      {totalExcluidas > 0 && (
        <ul className="-mt-8 flex flex-wrap gap-x-6 gap-y-1 text-xs text-tinta-suave">
          {Object.entries(r.excluidas).map(([motivo, cantidad]) => (
            <li key={motivo}>
              <span className="cifra text-tinta">{entero(cantidad)}</span> {motivoExclusion(motivo).toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {/* ------------------------------------------------------------ hallazgos */}
      <Bloque titulo="Hallazgos">
        <ol className="grid gap-4">
          {r.hallazgos.map((hallazgo, i) => (
            <li
              key={hallazgo}
              className="grid animate-aparecer grid-cols-[2.5rem_minmax(0,1fr)] gap-2 [animation-delay:calc(var(--i)*80ms)]"
              style={{ '--i': i } as CSSProperties}
            >
              <span className="cifra pt-1 text-sm text-sello">{String(i + 1).padStart(2, '0')}</span>
              <p className="text-[1.05rem] leading-relaxed text-tinta-media">{hallazgo}</p>
            </li>
          ))}
        </ol>
        {r.advertencias.length > 0 && (
          <div className="mt-6 grid gap-2">
            {r.advertencias.map((advertencia) => (
              <Aviso key={advertencia} tipo="advertencia">
                {advertencia}
              </Aviso>
            ))}
          </div>
        )}
      </Bloque>

      {/* ------------------------------------------------------------ pruebas de Benford */}
      {prueba && (
        <Bloque titulo="Pruebas de Benford">
          <div role="tablist" aria-label="Prueba" className="mb-6 flex flex-wrap gap-x-1 border-b border-linea">
            {r.pruebas.map((p) => {
              const activa = p.prueba === prueba.prueba
              return (
                <button
                  key={p.prueba}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setPruebaActiva(p.prueba)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
                    activa ? 'border-sello text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'
                  }`}
                >
                  {PRUEBA[p.prueba]}
                  {p.puntos > 0 && <span className="size-1.5 rounded-full bg-sello" aria-label="con hallazgos" />}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
            <GraficoDigitos key={prueba.prueba} prueba={prueba} />
            <MetricasPrueba prueba={prueba} />
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="rotulo mb-2 text-left">Resumen de las pruebas</caption>
              <thead>
                <tr className="rotulo border-b border-tinta text-right text-[0.6rem]">
                  <th className="py-2 text-left font-medium">Prueba</th>
                  <th className="py-2 font-medium">n</th>
                  <th className="py-2 font-medium">MAD</th>
                  <th className="py-2 font-medium">MAD azar</th>
                  <th className="py-2 font-medium">p (χ²)</th>
                  <th className="py-2 font-medium">Atípicos</th>
                  <th className="py-2 pl-4 text-left font-medium">Conformidad</th>
                </tr>
              </thead>
              <tbody>
                {r.pruebas.map((p) => (
                  <tr key={p.prueba} className="border-b border-linea text-right">
                    <td className="py-2 text-left">
                      {PRUEBA[p.prueba]}
                      {!p.muestra_suficiente && <span className="ml-2 text-xs text-ocre">muestra insuficiente</span>}
                    </td>
                    <td className="cifra py-2">{entero(p.n)}</td>
                    <td className="cifra py-2">{decimal(p.mad, 4)}</td>
                    <td className="cifra py-2 text-tinta-suave">{decimal(p.mad_esperada_por_azar, 4)}</td>
                    <td className={`cifra py-2 ${p.chi_cuadrado_significativo ? 'text-sello' : ''}`}>
                      {valorP(p.valor_p)}
                    </td>
                    <td className="cifra py-2">{entero(p.digitos_atipicos.length)}</td>
                    <td className="py-2 pl-4 text-left">
                      <EtiquetaConformidad conformidad={p.conformidad} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloque>
      )}

      {/* ------------------------------------------------------------ señales complementarias */}
      {(r.umbrales.length > 0 || r.redondeo) && (
        <Bloque titulo="Señales complementarias">
          <div className="grid gap-4 md:grid-cols-2">
            {r.umbrales.map((u) => (
              <Tarjeta key={u.nombre} alerta={u.alerta} titulo={u.nombre} rotulo="Fraccionamiento bajo umbral">
                <p className="text-sm text-tinta-media">
                  {entero(u.en_banda_inferior)} operaciones entre {monto(u.banda_inferior_desde, u.moneda)} y{' '}
                  {monto(u.monto, u.moneda)}, frente a {entero(u.en_banda_superior)} justo por encima.
                </p>
                <p className="cifra mt-2 text-xs text-tinta-suave">
                  razón {razonUmbral(u.razon_observada, u.en_banda_inferior)} · esperada{' '}
                  {decimal(u.razon_esperada, 2)}
                </p>
              </Tarjeta>
            ))}
            {r.redondeo && (
              <Tarjeta alerta={r.redondeo.alerta} titulo="Montos redondos" rotulo={`Múltiplos de ${entero(r.redondeo.multiplo)}`}>
                <p className="text-sm text-tinta-media">
                  {entero(r.redondeo.redondos)} de {entero(r.redondeo.evaluados)} montos son redondos (
                  {porcentaje(r.redondeo.proporcion)}); lo esperado es ≈ {porcentaje(r.redondeo.esperada)}.
                </p>
              </Tarjeta>
            )}
          </div>
        </Bloque>
      )}

      {/* ------------------------------------------------------------ segmentos */}
      {r.grupos.length > 0 && (
        <Bloque titulo={`Segmentos ${parametros.agrupar_por ? AGRUPACION[parametros.agrupar_por].toLowerCase() : ''}`}>
          <ul className="grid gap-px border-y border-tinta bg-linea">
            {r.grupos.map((g) => (
              <li
                key={g.clave}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 bg-papel py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto_auto]"
              >
                <span className="cifra truncate text-sm" title={g.clave}>
                  {nombreSegmento(g.clave)}
                </span>
                <span className="col-span-2 flex items-center gap-3 sm:col-span-1">
                  <span className="h-1.5 flex-1 bg-papel-hondo">
                    <span
                      className={`block h-full ${FONDO_NIVEL[g.nivel_riesgo]} w-(--ancho)`}
                      style={{ '--ancho': `${g.puntaje}%` } as CSSProperties}
                    />
                  </span>
                  <span className="cifra w-8 text-right text-sm">{decimal(g.puntaje, 0)}</span>
                </span>
                <span className="cifra hidden text-xs text-tinta-suave sm:inline">{entero(g.total_analizadas)} op.</span>
                <span className="row-start-1 justify-self-end sm:row-auto">
                  <EtiquetaNivel nivel={g.nivel_riesgo} />
                </span>
              </li>
            ))}
          </ul>
          {r.grupos_omitidos_por_tamano > 0 && (
            <p className="mt-3 text-xs text-tinta-suave">
              {entero(r.grupos_omitidos_por_tamano)} segmentos sin evaluar por no alcanzar la muestra mínima.
            </p>
          )}
        </Bloque>
      )}

      {/* ------------------------------------------------------------ parámetros */}
      <details className="border-t border-linea pt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-tinta-suave hover:text-tinta">
          Parámetros usados en este análisis
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Parametro nombre="Monto mínimo" valor={monto(parametros.monto_minimo, moneda)} />
          <Parametro
            nombre="Tasa BCV"
            valor={parametros.tasa_bcv_predeterminada ? `${decimal(Number(parametros.tasa_bcv_predeterminada), 2)} Bs/US$` : '—'}
          />
          <Parametro nombre="Muestra mínima" valor={entero(parametros.tamano_muestra_minimo)} />
          <Parametro nombre="Reconversión" valor={parametros.aplicar_reconversion ? 'Aplicada' : 'No'} />
          <Parametro nombre="z crítico" valor={decimal(parametros.z_critico, 2)} />
          <Parametro nombre="α" valor={decimal(parametros.alfa, 2)} />
          <Parametro nombre="MAD ajustada" valor={parametros.ajustar_mad_por_tamano ? 'Sí' : 'No'} />
          <Parametro nombre="Bonferroni" valor={parametros.corregir_comparaciones_multiples ? 'Sí' : 'No'} />
        </dl>
      </details>
    </article>
  )
}

/** Sin operaciones encima del umbral la razón no existe: ∞ si hay debajo, — si no hay ninguna. */
function razonUmbral(razon: number | null, debajo: number): string {
  if (razon !== null) return decimal(razon, 2)
  return debajo > 0 ? '∞' : '—'
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-5">
      <h2 className="font-serif text-3xl leading-none tracking-tight">{titulo}</h2>
      <div>{children}</div>
    </section>
  )
}

function Cifra({ etiqueta, valor, ancho = false }: { etiqueta: string; valor: ReactNode; ancho?: boolean }) {
  return (
    <div className={`border-linea px-1 py-4 md:border-l md:px-4 md:first:border-l-0 md:first:pl-0 ${ancho ? 'col-span-2 md:col-span-1' : ''}`}>
      <dt className="rotulo text-[0.6rem]">{etiqueta}</dt>
      <dd className="cifra mt-1 text-2xl">{valor}</dd>
    </div>
  )
}

function MetricasPrueba({ prueba }: { prueba: ResultadoPrueba }) {
  return (
    <dl className="grid content-start gap-4 border-l-2 border-tinta pl-5 text-sm">
      <div>
        <dt className="rotulo text-[0.6rem]">Conformidad</dt>
        <dd className="mt-1.5">
          <EtiquetaConformidad conformidad={prueba.conformidad} />
        </dd>
      </div>
      <Parametro nombre="MAD observada" valor={decimal(prueba.mad, 4)} />
      <Parametro nombre="MAD esperada por azar" valor={decimal(prueba.mad_esperada_por_azar, 4)} />
      <Parametro
        nombre={`χ² (${prueba.grados_libertad} g.l.)`}
        valor={`p = ${valorP(prueba.valor_p)}`}
        destacado={prueba.chi_cuadrado_significativo}
      />
      <Parametro
        nombre="Kolmogorov-Smirnov"
        valor={`${decimal(prueba.kolmogorov_smirnov, 4)} / ${decimal(prueba.ks_valor_critico, 4)}`}
        destacado={prueba.ks_significativo}
      />
      <Parametro nombre="Montos evaluados" valor={entero(prueba.n)} />
      {!prueba.muestra_suficiente && (
        <p className="text-xs leading-relaxed text-ocre">
          Muestra menor al mínimo configurado: el resultado es orientativo y no suma al puntaje.
        </p>
      )}
    </dl>
  )
}

function Parametro({ nombre, valor, destacado = false }: { nombre: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <dt className="rotulo text-[0.6rem]">{nombre}</dt>
      <dd className={`cifra mt-0.5 ${destacado ? 'text-sello' : ''}`}>{valor}</dd>
    </div>
  )
}

function EtiquetaConformidad({ conformidad }: { conformidad: Conformidad }) {
  return (
    <span
      className={`inline-block rounded-xs border px-1.5 py-px text-xs whitespace-nowrap ${COLOR_CONFORMIDAD[conformidad]}`}
    >
      {CONFORMIDAD[conformidad]}
    </span>
  )
}

function Tarjeta({
  alerta,
  titulo,
  rotulo,
  children,
}: {
  alerta: boolean
  titulo: string
  rotulo: string
  children: ReactNode
}) {
  return (
    <div className={`border p-5 ${alerta ? 'border-sello bg-sello/[0.04]' : 'border-linea bg-papel-claro/60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rotulo text-[0.6rem]">{rotulo}</p>
          <h3 className="mt-1 font-serif text-xl leading-tight">{titulo}</h3>
        </div>
        <span
          className={`shrink-0 font-mono text-[0.65rem] tracking-widest uppercase ${alerta ? 'text-sello' : 'text-conforme'}`}
        >
          {alerta ? 'Alerta' : 'Normal'}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
