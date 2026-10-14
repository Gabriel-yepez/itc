import type { ReactNode } from 'react'

import { entero } from '../../utilidades/formato'

interface Props {
  maxMb: number
  maxFilas: number
  /** Operaciones válidas por debajo de las cuales el resultado es solo orientativo (del perfil). */
  muestraMinima: number
  onDescargarPlantilla: () => void
}

const COLUMNAS: { nombre: string; obligatoria?: boolean; descripcion: ReactNode; ejemplo: string }[] = [
  {
    nombre: 'monto',
    obligatoria: true,
    descripcion: 'Importe de la operación, mayor que cero. Se aceptan «Bs.», «$» y separador de miles.',
    ejemplo: '1.234,56',
  },
  { nombre: 'moneda', descripcion: 'VES o USD. Si falta, VES.', ejemplo: 'USD' },
  {
    nombre: 'fecha',
    descripcion: 'En el formato elegido en «Fechas». Sirve para llevar a bolívares digitales los montos anteriores a 2008, 2018 o 2021.',
    ejemplo: '15/03/2024',
  },
  {
    nombre: 'canal',
    descripcion:
      'Pago Móvil, Transferencia, Punto de venta, Biopago, Efectivo, Divisas, Criptoactivos u Otro (con o sin acentos). Si falta, Otro.',
    ejemplo: 'Pago Móvil',
  },
  { nombre: 'tipo', descripcion: 'Débito o Crédito.', ejemplo: 'Débito' },
  {
    nombre: 'cuenta',
    descripcion: 'Identificador de la cuenta (mejor anonimizado), hasta 100 caracteres. Permite segmentar por cuenta.',
    ejemplo: 'cta-0777',
  },
  {
    nombre: 'tasa_bcv',
    descripcion: 'Bs por US$ del día. Necesaria para convertir montos en otra moneda si el perfil no trae una tasa.',
    ejemplo: '36,50',
  },
  { nombre: 'id', descripcion: 'Referencia de la operación, hasta 100 caracteres. No interviene en el cálculo.', ejemplo: 'TX-001' },
]

/** Explica cómo preparar el extracto: estructura, valores aceptados, límites y cómo sacarlo de Excel. */
export function GuiaArchivo({ maxMb, maxFilas, muestraMinima, onDescargarPlantilla }: Props) {
  return (
    <details className="group min-w-0 border border-linea bg-papel-claro/60">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>
          Cómo preparar el archivo
          <span className="ml-2 font-normal text-tinta-suave">
            columnas, límites y Excel
          </span>
        </span>
        <span className="font-mono text-tinta-suave transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="grid grid-cols-1 gap-5 border-t border-linea px-3 pt-4 pb-5 text-xs leading-relaxed text-tinta-media">
        <Apartado titulo="Desde Excel">
          <p>
            La aplicación lee archivos <strong>CSV</strong>, no <code className="cifra">.xlsx</code>. En Excel use{' '}
            <em>Archivo → Guardar como → «CSV UTF-8 (delimitado por comas)»</em>. Elija UTF-8: con otra
            codificación los acentos («Pago Móvil») no se leen. Si su Excel está en español, el separador suele ser
            punto y coma: márquelo arriba en «Separador».
          </p>
        </Apartado>

        <Apartado titulo="Estructura">
          <ul className="grid gap-1 pl-4 [list-style:disc]">
            <li>La primera fila lleva los nombres de las columnas; cada fila siguiente es una operación.</li>
            <li>
              Las columnas pueden ir en cualquier orden. En los nombres no importan las mayúsculas ni los espacios al
              inicio o al final, pero deben escribirse tal cual: <code className="cifra">tasa_bcv</code>, no «tasa bcv».
            </li>
            <li>Las columnas con otros nombres se ignoran; solo <code className="cifra">monto</code> es obligatoria.</li>
          </ul>
          <dl className="mt-3 grid gap-2.5">
            {COLUMNAS.map((columna) => (
              <div key={columna.nombre} className="grid gap-0.5 border-l-2 border-linea pl-2.5">
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <code className="cifra text-[0.8rem] text-tinta">{columna.nombre}</code>
                  {columna.obligatoria && (
                    <span className="font-mono text-[0.6rem] tracking-widest text-sello uppercase">obligatoria</span>
                  )}
                  <span className="cifra text-tinta-suave">ej. {columna.ejemplo}</span>
                </dt>
                <dd>{columna.descripcion}</dd>
              </div>
            ))}
          </dl>
          <pre className="cifra mt-3 overflow-x-auto bg-papel-hondo px-2.5 py-2 text-[0.7rem] leading-snug text-tinta">
            {`fecha;monto;moneda;canal;tipo;cuenta;tasa_bcv
15/03/2024;1.234,56;VES;Pago Móvil;Débito;cta-0001;36,50
15/03/2024;250,00;USD;Divisas;Crédito;cta-0002;36,50`}
          </pre>
        </Apartado>

        <Apartado titulo="Límites">
          <ul className="grid gap-1 pl-4 [list-style:disc]">
            <li>
              Hasta <strong>{maxMb} MB</strong> y <strong>{entero(maxFilas)} operaciones</strong> por archivo.
            </li>
            <li>Montos entre 0,000001 y 10¹⁸, con hasta 30 cifras.</li>
            <li>
              Se recomiendan al menos <strong>{entero(muestraMinima)} operaciones válidas</strong> por análisis y
              por segmento: con menos, el resultado es solo orientativo y no suma puntos de riesgo.
            </li>
            <li>
              Los montos deben abarcar varios órdenes de magnitud (por ejemplo, de 10 a 100.000). Con rangos
              estrechos o tarifas fijas la Ley de Benford no es fiable.
            </li>
            <li>Un análisis a la vez por usuario.</li>
          </ul>
        </Apartado>

        <Apartado titulo="Si hay filas con errores">
          <p>
            El análisis se detiene e indica qué filas fallaron (hasta 10). Para continuar sin ellas, marque «Omitir
            filas inválidas»: el resultado dirá cuántas se omitieron. Las operaciones del archivo no se guardan; solo
            queda el resultado del análisis, cifrado.
          </p>
        </Apartado>

        <button
          type="button"
          onClick={onDescargarPlantilla}
          className="justify-self-start border border-tinta px-3 py-1.5 text-xs font-medium text-tinta transition-colors hover:bg-tinta hover:text-papel"
        >
          Descargar plantilla CSV
        </button>
      </div>
    </details>
  )
}

function Apartado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h4 className="rotulo mb-1.5 text-[0.62rem] text-tinta">{titulo}</h4>
      {children}
    </section>
  )
}
