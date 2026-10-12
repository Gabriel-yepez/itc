import type { ReactNode } from 'react'

import { Marca } from './Marca'

/** Clase de los campos de texto de las pantallas de cuenta (contraseñas, códigos). */
export const CLASE_CAMPO =
  'w-full border-0 border-b border-linea-fuerte bg-transparent px-0 py-2.5 text-lg text-tinta transition-colors placeholder:text-tinta-suave/50 focus:border-tinta focus:outline-none cifra'

interface Props {
  /** Botón de la cabecera: "Salir", "Volver"… */
  accion?: { texto: string; onClick: () => void }
  /** Ancho de la tarjeta: los códigos de recuperación necesitan algo más de espacio. */
  ancho?: 'md' | 'lg'
  children: ReactNode
}

/**
 * Pantallas de cuenta fuera de la app (cambio de contraseña, doble factor): franja oscura con
 * la marca y una tarjeta que monta sobre ella, igual que el login en móvil.
 */
export function MarcoTarjeta({ accion, ancho = 'md', children }: Props) {
  const maximo = ancho === 'lg' ? 'max-w-lg' : 'max-w-md'
  return (
    <main className="min-h-dvh">
      <header className="relative isolate overflow-hidden bg-tinta px-5 pt-6 pb-16 text-papel sm:px-8 sm:pt-8 sm:pb-20">
        <div aria-hidden="true" className="grano absolute inset-0 -z-10 opacity-60 mix-blend-screen" />
        <div className={`mx-auto flex ${maximo} items-center justify-between gap-4`}>
          <Marca claro />
          {accion && (
            <button
              type="button"
              onClick={accion.onClick}
              className="-my-2 py-2 font-mono text-[0.7rem] tracking-wider text-papel/70 uppercase hover:text-papel"
            >
              {accion.texto}
            </button>
          )}
        </div>
      </header>
      <section className="relative z-10 -mt-10 px-4 pb-10 sm:-mt-12 sm:px-8">
        <div
          className={`mx-auto w-full ${maximo} animate-aparecer border border-linea bg-papel-claro px-6 pt-7 pb-8 shadow-[0_28px_50px_-30px_rgb(23_20_15/0.5)] sm:px-10 sm:pt-9 sm:pb-10`}
        >
          {children}
        </div>
      </section>
    </main>
  )
}

/** Encabezado de la tarjeta: rótulo con punto de color, título y explicación. */
export function EncabezadoTarjeta({
  rotulo,
  titulo,
  children,
}: {
  rotulo: ReactNode
  titulo: string
  children?: ReactNode
}) {
  return (
    <>
      <p className="rotulo flex items-center gap-2">
        <span className="inline-block size-1.5 rounded-full bg-ocre" aria-hidden="true" />
        {rotulo}
      </p>
      <h1 className="mt-3 font-serif text-[2.3rem] leading-none tracking-tight sm:text-[2.6rem]">{titulo}</h1>
      {children && <div className="mt-3 text-[0.95rem] text-tinta-suave">{children}</div>}
    </>
  )
}

/** Botón principal negro con flecha, el mismo del login. */
export function BotonPrincipal({
  enviando = false,
  texto,
  textoEnviando,
  tipo = 'submit',
  onClick,
  deshabilitado = false,
}: {
  enviando?: boolean
  texto: string
  textoEnviando?: string
  tipo?: 'submit' | 'button'
  onClick?: () => void
  deshabilitado?: boolean
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={enviando || deshabilitado}
      className="group mt-9 flex min-h-12 w-full items-center justify-between bg-tinta px-5 py-3.5 text-papel transition-colors duration-300 hover:bg-sello disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-tinta"
    >
      <span className="font-medium tracking-wide">{enviando ? (textoEnviando ?? texto) : texto}</span>
      <span aria-hidden="true" className="font-mono transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </button>
  )
}
