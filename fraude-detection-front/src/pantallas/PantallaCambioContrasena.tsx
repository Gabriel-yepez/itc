import { useId, useState, type FormEvent } from 'react'

import { api, ErrorApi, type ErrorValidacion, type UsuarioPublico } from '../api'
import { Aviso } from '../componentes/Aviso'
import { BotonPrincipal, CLASE_CAMPO, EncabezadoTarjeta, MarcoTarjeta } from '../componentes/MarcoTarjeta'

const MINIMO = 12

interface Props {
  usuario: UsuarioPublico
  /** El cambio cierra todas las sesiones: hay que volver a ingresar con la contraseña nueva. */
  onCambiada: () => void
  onCerrarSesion: () => Promise<void>
}

/**
 * Primer ingreso con una contraseña asignada por otra persona (administrador inicial o alta
 * hecha por un administrador): la API no permite nada más hasta reemplazarla.
 */
export function PantallaCambioContrasena({ usuario, onCambiada, onCerrarSesion }: Props) {
  const id = useId()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [ver, setVer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ mensaje: string; validaciones: readonly ErrorValidacion[] } | null>(
    null,
  )

  function problemaLocal(): string | null {
    if (!actual || !nueva || !confirmacion) return 'Complete los tres campos.'
    if (nueva.length < MINIMO) return `La nueva contraseña debe tener al menos ${MINIMO} caracteres.`
    if (nueva === actual) return 'La nueva contraseña debe ser distinta de la actual.'
    if (nueva !== confirmacion) return 'La confirmación no coincide con la nueva contraseña.'
    return null
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    const problema = problemaLocal()
    if (problema) {
      setError({ mensaje: problema, validaciones: [] })
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await api.auth.cambiarContrasena({ contrasena_actual: actual, contrasena_nueva: nueva })
      onCambiada()
    } catch (causa) {
      const e = causa instanceof ErrorApi ? causa : null
      setError({
        mensaje: e?.message ?? 'No fue posible cambiar la contraseña.',
        validaciones: e?.validaciones ?? [],
      })
      setEnviando(false)
    }
  }

  const largo = nueva.length

  return (
    <MarcoTarjeta accion={{ texto: 'Salir', onClick: () => void onCerrarSesion() }}>
      <form onSubmit={enviar} noValidate>
        <EncabezadoTarjeta rotulo={`Primer ingreso · ${usuario.nombre_usuario}`} titulo="Elija su contraseña">
          La contraseña que le asignaron es temporal. Reemplácela por una propia para continuar.
        </EncabezadoTarjeta>

        <div className="mt-6 grid gap-4" aria-live="polite">
          {error && (
            <Aviso titulo="No se pudo cambiar" validaciones={error.validaciones}>
              {error.mensaje}
            </Aviso>
          )}
        </div>

        <div className="mt-6 grid gap-7">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${id}-actual`} className="rotulo">
                Contraseña actual
              </label>
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                aria-pressed={ver}
                className="-my-2 -mr-2 px-2 py-2 font-mono text-[0.68rem] tracking-wider text-tinta-suave uppercase underline-offset-4 hover:text-tinta hover:underline"
              >
                {ver ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              id={`${id}-actual`}
              type={ver ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={128}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className={CLASE_CAMPO}
            />
          </div>

          <div>
            <label htmlFor={`${id}-nueva`} className="rotulo">
              Nueva contraseña
            </label>
            <input
              id={`${id}-nueva`}
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={128}
              aria-describedby={`${id}-ayuda`}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={CLASE_CAMPO}
            />
            <p id={`${id}-ayuda`} className="mt-1.5 flex justify-between text-xs text-tinta-suave">
              <span>Al menos {MINIMO} caracteres. Una frase larga es más segura.</span>
              <span className={`cifra ${largo >= MINIMO ? 'text-conforme' : ''}`}>
                {largo}/{MINIMO}
              </span>
            </p>
          </div>

          <div>
            <label htmlFor={`${id}-confirmacion`} className="rotulo">
              Repita la nueva contraseña
            </label>
            <input
              id={`${id}-confirmacion`}
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={128}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              className={CLASE_CAMPO}
            />
          </div>
        </div>

        <BotonPrincipal enviando={enviando} texto="Guardar contraseña" textoEnviando="Guardando…" />

        <p className="mt-6 border-t border-linea pt-4 text-xs leading-relaxed text-tinta-suave">
          Al guardarla se cierran todas sus sesiones y deberá ingresar de nuevo con la contraseña nueva.
        </p>
      </form>
    </MarcoTarjeta>
  )
}
