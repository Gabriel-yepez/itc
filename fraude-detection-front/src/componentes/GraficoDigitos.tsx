import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

import type { ResultadoPrueba } from '../api'
import { PRUEBA } from '../utilidades/etiquetas'
import { decimal, entero, porcentaje } from '../utilidades/formato'

const ANCHO_INICIAL = 760
const ANCHO_MINIMO = 280
const M = { arriba: 18, derecha: 8, abajo: 34, izquierda: 44 }

/**
 * Ancho real del contenedor. El SVG se dibuja a escala 1:1 en vez de reducir un lienzo fijo:
 * así los rótulos conservan su tamaño en el móvil en lugar de encogerse hasta ser ilegibles.
 */
function useAncho(ref: RefObject<HTMLElement | null>): number {
  const [ancho, setAncho] = useState(ANCHO_INICIAL)
  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setAncho(Math.max(ANCHO_MINIMO, Math.round(entrada.contentRect.width)))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref])
  return ancho
}

interface Props {
  prueba: ResultadoPrueba
}

/** Frecuencia observada de cada dígito (barras) frente a la que predice Benford (línea). */
export function GraficoDigitos({ prueba }: Props) {
  const { frecuencias } = prueba
  const contenedor = useRef<HTMLElement>(null)
  const ANCHO = useAncho(contenedor)
  const angosto = ANCHO < 560
  const ALTO = angosto ? 230 : 300
  const INTERIOR_X = ANCHO - M.izquierda - M.derecha
  const INTERIOR_Y = ALTO - M.arriba - M.abajo
  const n = frecuencias.length
  const pocos = n <= 10
  const paso = INTERIOR_X / n
  const anchoBarra = paso * (pocos ? 0.56 : 0.72)
  const maximo = Math.max(...frecuencias.map((f) => Math.max(f.proporcion, f.esperada))) * 1.12 || 1
  const y = (valor: number) => M.arriba + INTERIOR_Y * (1 - valor / maximo)
  const centro = (i: number) => M.izquierda + paso * i + paso / 2
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((k) => maximo * k)
  const etiquetaDigito = (d: number) => (prueba.prueba === 'ultimos_dos_digitos' ? String(d).padStart(2, '0') : String(d))
  const mostrarEtiqueta = (d: number) => pocos || d % 10 === 0

  return (
    <figure ref={contenedor} className="grid min-w-0 gap-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${PRUEBA[prueba.prueba]}: frecuencia observada frente a la esperada por la Ley de Benford. ${
          prueba.digitos_atipicos.length
        } dígitos con desviación significativa.`}
      >
        {marcas.map((valor) => (
          <g key={valor}>
            <line
              x1={M.izquierda}
              x2={ANCHO - M.derecha}
              y1={y(valor)}
              y2={y(valor)}
              className={valor === 0 ? 'stroke-tinta' : 'stroke-linea'}
              strokeDasharray={valor === 0 ? undefined : '2 4'}
            />
            <text
              x={M.izquierda - 8}
              y={y(valor)}
              dy="0.32em"
              textAnchor="end"
              className="fill-tinta-suave font-mono text-[11px]"
            >
              {porcentaje(valor, pocos ? 0 : 1)}
            </text>
          </g>
        ))}

        {frecuencias.map((f, i) => {
          const alto = INTERIOR_Y * (f.proporcion / maximo)
          return (
            <rect
              key={f.digito}
              x={centro(i) - anchoBarra / 2}
              y={M.arriba + INTERIOR_Y - alto}
              width={anchoBarra}
              height={alto}
              style={{ '--i': i } as CSSProperties}
              className={`origin-bottom animate-crecer transition-opacity [transform-box:fill-box] hover:opacity-75 ${
                pocos ? '[animation-delay:calc(var(--i)*55ms)]' : '[animation-delay:calc(var(--i)*8ms)]'
              } ${f.atipico ? 'fill-sello' : 'fill-tinta'}`}
            >
              <title>
                {`Dígito ${etiquetaDigito(f.digito)}: ${porcentaje(f.proporcion, 2)} observado (${entero(
                  f.observados,
                )}) · ${porcentaje(f.esperada, 2)} esperado · z = ${decimal(f.z, 2)}${f.atipico ? ' · atípico' : ''}`}
              </title>
            </rect>
          )
        })}

        <polyline
          points={frecuencias.map((f, i) => `${centro(i)},${y(f.esperada)}`).join(' ')}
          className="animate-aparecer fill-none stroke-ocre [animation-delay:400ms]"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {pocos &&
          frecuencias.map((f, i) => (
            <circle
              key={f.digito}
              cx={centro(i)}
              cy={y(f.esperada)}
              r={3.5}
              className="animate-aparecer fill-papel stroke-ocre [animation-delay:400ms]"
              strokeWidth={2}
            />
          ))}

        {frecuencias.map(
          (f, i) =>
            mostrarEtiqueta(f.digito) && (
              <text
                key={f.digito}
                x={centro(i)}
                y={ALTO - M.abajo + 20}
                textAnchor="middle"
                className={`font-serif ${pocos ? (angosto ? 'text-[16px]' : 'text-[19px]') : angosto ? 'text-[12px]' : 'text-[14px]'} ${
                  f.atipico ? 'fill-sello' : 'fill-tinta'
                }`}
              >
                {etiquetaDigito(f.digito)}
              </text>
            ),
        )}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-tinta-suave">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-tinta" aria-hidden="true" /> Observado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-ocre" aria-hidden="true" /> Esperado (Benford)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-sello" aria-hidden="true" /> Desviación significativa (z &gt;{' '}
          {decimal(prueba.z_critico_aplicado, 2)})
        </span>
      </figcaption>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-tinta-suave hover:text-tinta">
          Ver tabla de frecuencias
        </summary>
        <div className="mt-2 max-h-72 overflow-auto border border-linea">
          <table className="w-full text-right">
            <thead className="sticky top-0 bg-papel-hondo">
              <tr className="rotulo text-[0.6rem]">
                <th className="px-3 py-1.5 text-left font-medium">Dígito</th>
                <th className="px-3 py-1.5 font-medium">Casos</th>
                <th className="px-3 py-1.5 font-medium">Observado</th>
                <th className="px-3 py-1.5 font-medium">Esperado</th>
                <th className="px-3 py-1.5 font-medium">z</th>
              </tr>
            </thead>
            <tbody className="cifra text-xs">
              {frecuencias.map((f) => (
                <tr key={f.digito} className={`border-t border-linea ${f.atipico ? 'text-sello' : ''}`}>
                  <td className="px-3 py-1 text-left">{etiquetaDigito(f.digito)}</td>
                  <td className="px-3 py-1">{entero(f.observados)}</td>
                  <td className="px-3 py-1">{porcentaje(f.proporcion, 2)}</td>
                  <td className="px-3 py-1">{porcentaje(f.esperada, 2)}</td>
                  <td className="px-3 py-1">{decimal(f.z, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
