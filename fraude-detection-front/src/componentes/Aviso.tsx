import type { ReactNode } from 'react'

import type { ErrorValidacion } from '../api'

type TipoAviso = 'error' | 'advertencia' | 'info'

const ESTILO: Record<TipoAviso, { caja: string; titulo: string }> = {
  error: { caja: 'border-sello bg-sello/[0.07]', titulo: 'text-sello' },
  advertencia: { caja: 'border-ocre bg-ocre/[0.08]', titulo: 'text-ocre' },
  info: { caja: 'border-tinta-suave bg-papel-claro', titulo: 'text-tinta-suave' },
}

interface Props {
  tipo?: TipoAviso
  titulo?: string
  validaciones?: readonly ErrorValidacion[]
  children: ReactNode
}

export function Aviso({ tipo = 'error', titulo, validaciones = [], children }: Props) {
  const estilo = ESTILO[tipo]
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`animate-aparecer border-l-[3px] px-3.5 py-2.5 text-sm text-tinta-media ${estilo.caja}`}
    >
      {titulo && <p className={`mb-0.5 font-semibold ${estilo.titulo}`}>{titulo}</p>}
      <div>{children}</div>
      {validaciones.length > 0 && (
        <ul className="mt-1.5 grid gap-1 text-[0.82rem]">
          {validaciones.slice(0, 8).map((v) => (
            <li key={`${v.campo}-${v.mensaje}`}>
              {v.campo && <code className="cifra text-[0.78rem] text-tinta">{v.campo}</code>} {v.mensaje}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
