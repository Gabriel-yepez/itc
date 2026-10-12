import { useId, useRef, useState, type FormEvent } from 'react'

import { ErrorApi } from '../api'
import { Aviso } from '../componentes/Aviso'
import { BotonPrincipal, CLASE_CAMPO, EncabezadoTarjeta, MarcoTarjeta } from '../componentes/MarcoTarjeta'

interface Props {
  onVerificar: (codigo: string) => Promise<void>
  onVolver: () => void
}

/** Segundo paso del ingreso: código de la app de autenticación o uno de recuperación. */
export function PantallaSegundoFactor({ onVerificar, onVolver }: Props) {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const [recuperacion, setRecuperacion] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)

  async function verificar(valor: string) {
    if (enviando) return
    setEnviando(true)
    setError(null)
    try {
      await onVerificar(valor)
    } catch (causa) {
      setError(causa instanceof ErrorApi ? causa.message : 'No fue posible verificar el código.')
      setCodigo('')
      setEnviando(false)
      campo.current?.focus()
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const valor = codigo.trim()
    if (recuperacion ? valor.replace(/[-\s]/g, '').length !== 10 : valor.length !== 6) {
      setError(recuperacion ? 'El código de recuperación tiene 10 caracteres.' : 'El código tiene 6 dígitos.')
      return
    }
    void verificar(valor)
  }

  function cambiarCodigo(valor: string) {
    if (recuperacion) {
      setCodigo(valor.slice(0, 11))
      return
    }
    const digitos = valor.replace(/\D/g, '').slice(0, 6)
    setCodigo(digitos)
    // Al completar los 6 dígitos se envía solo: es lo que espera quien copia el código de la app.
    if (digitos.length === 6) void verificar(digitos)
  }

  function alternarRecuperacion() {
    setRecuperacion((r) => !r)
    setCodigo('')
    setError(null)
    campo.current?.focus()
  }

  return (
    <MarcoTarjeta accion={{ texto: 'Volver', onClick: onVolver }}>
      <form onSubmit={enviar} noValidate>
        <EncabezadoTarjeta rotulo="Verificación en dos pasos" titulo="Ingrese el código">
          {recuperacion
            ? 'Escriba uno de los códigos de recuperación que guardó al activar la verificación. Cada uno sirve una sola vez.'
            : 'Abra su app de autenticación y escriba el código de 6 dígitos de esta cuenta.'}
        </EncabezadoTarjeta>

        <div className="mt-6 grid gap-4" aria-live="polite">
          {error && <Aviso titulo="No se pudo verificar">{error}</Aviso>}
        </div>

        <div className="mt-6">
          <label htmlFor={`${id}-codigo`} className="rotulo">
            {recuperacion ? 'Código de recuperación' : 'Código'}
          </label>
          <input
            ref={campo}
            id={`${id}-codigo`}
            autoFocus
            inputMode={recuperacion ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={recuperacion ? 'abcde-fghjk' : '000000'}
            value={codigo}
            onChange={(e) => cambiarCodigo(e.target.value)}
            className={`${CLASE_CAMPO} ${recuperacion ? '' : 'text-center text-3xl tracking-[0.5em]'}`}
          />
        </div>

        <BotonPrincipal enviando={enviando} texto="Verificar" textoEnviando="Verificando…" />

        <p className="mt-6 border-t border-linea pt-4 text-xs leading-relaxed text-tinta-suave">
          ¿No tiene el teléfono?{' '}
          <button
            type="button"
            onClick={alternarRecuperacion}
            className="font-medium text-tinta underline underline-offset-4 hover:text-sello"
          >
            {recuperacion ? 'Usar el código de la app' : 'Usar un código de recuperación'}
          </button>
          . Si perdió ambos, pida a otro administrador que restablezca su verificación.
        </p>
      </form>
    </MarcoTarjeta>
  )
}
