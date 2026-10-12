import { useId, useState, type FormEvent } from 'react'

import { api, ErrorApi, type ConfiguracionSegundoFactor, type UsuarioPublico } from '../api'
import { Aviso } from '../componentes/Aviso'
import { BotonPrincipal, CLASE_CAMPO, EncabezadoTarjeta, MarcoTarjeta } from '../componentes/MarcoTarjeta'

interface Props {
  usuario: UsuarioPublico
  /** Activarlo cierra todas las sesiones: se vuelve a ingresar, ya con código. */
  onActivado: () => void
  onCerrarSesion: () => Promise<void>
}

type Paso =
  | { tipo: 'contrasena' }
  | { tipo: 'escanear'; configuracion: ConfiguracionSegundoFactor }
  | { tipo: 'codigos'; codigos: string[] }

/** Configuración obligatoria del doble factor para administradores. */
export function PantallaConfigurarSegundoFactor({ usuario, onActivado, onCerrarSesion }: Props) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'contrasena' })
  // En el último paso la sesión ya no existe (el servidor la cerró): "Salir" solo vuelve al ingreso.
  const accion =
    paso.tipo === 'codigos'
      ? { texto: 'Salir', onClick: onActivado }
      : { texto: 'Salir', onClick: () => void onCerrarSesion() }

  return (
    <MarcoTarjeta accion={accion} ancho={paso.tipo === 'contrasena' ? 'md' : 'lg'}>
      {paso.tipo === 'contrasena' && (
        <PasoContrasena usuario={usuario} onListo={(configuracion) => setPaso({ tipo: 'escanear', configuracion })} />
      )}
      {paso.tipo === 'escanear' && (
        <PasoEscanear configuracion={paso.configuracion} onListo={(codigos) => setPaso({ tipo: 'codigos', codigos })} />
      )}
      {paso.tipo === 'codigos' && <PasoCodigos codigos={paso.codigos} usuario={usuario} onListo={onActivado} />}
    </MarcoTarjeta>
  )
}

function Progreso({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex gap-1.5" aria-label={`Paso ${actual} de 3`}>
      {[1, 2, 3].map((n) => (
        <li key={n} className={`h-1 flex-1 ${n <= actual ? 'bg-sello' : 'bg-linea'}`} aria-hidden="true" />
      ))}
    </ol>
  )
}

function mensajeDe(causa: unknown, porDefecto: string): string {
  return causa instanceof ErrorApi ? causa.message : porDefecto
}

function PasoContrasena({
  usuario,
  onListo,
}: {
  usuario: UsuarioPublico
  onListo: (configuracion: ConfiguracionSegundoFactor) => void
}) {
  const id = useId()
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    if (!contrasena) {
      setError('Ingrese su contraseña.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      onListo(await api.auth.configurarSegundoFactor(contrasena))
    } catch (causa) {
      setError(mensajeDe(causa, 'No fue posible iniciar la configuración.'))
      setContrasena('')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Progreso actual={1} />
      <EncabezadoTarjeta rotulo={`Seguridad · ${usuario.nombre_usuario}`} titulo="Verificación en dos pasos">
        Los administradores deben confirmar cada ingreso con un código de su teléfono: aunque alguien
        consiga su contraseña, no podrá entrar. Necesitará una app como Google Authenticator,
        Microsoft Authenticator o Aegis.
      </EncabezadoTarjeta>

      <div className="mt-6 grid gap-4" aria-live="polite">
        {error && <Aviso titulo="No se pudo continuar">{error}</Aviso>}
      </div>

      <div className="mt-6">
        <label htmlFor={`${id}-contrasena`} className="rotulo">
          Confirme su contraseña
        </label>
        <input
          id={`${id}-contrasena`}
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className={CLASE_CAMPO}
        />
      </div>

      <BotonPrincipal enviando={enviando} texto="Continuar" textoEnviando="Preparando…" />
    </form>
  )
}

function PasoEscanear({
  configuracion,
  onListo,
}: {
  configuracion: ConfiguracionSegundoFactor
  onListo: (codigos: string[]) => void
}) {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const secretoEnGrupos = configuracion.secreto.match(/.{1,4}/g)?.join(' ') ?? configuracion.secreto

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    if (codigo.length !== 6) {
      setError('Escriba el código de 6 dígitos que muestra la app.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      onListo((await api.auth.activarSegundoFactor(codigo)).codigos_recuperacion)
    } catch (causa) {
      setError(mensajeDe(causa, 'No fue posible activar la verificación.'))
      setCodigo('')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Progreso actual={2} />
      <EncabezadoTarjeta rotulo="Paso 2 de 3" titulo="Vincule su teléfono" />

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <img
          src={configuracion.qr}
          alt="Código QR para la app de autenticación"
          className="mx-auto size-44 border border-linea bg-white p-1 sm:mx-0"
        />
        <ol className="grid gap-3 text-sm leading-relaxed text-tinta-media">
          <li>
            <span className="cifra mr-1.5 text-sello">1</span>En la app, elija «Agregar cuenta» y escanee el código.
          </li>
          <li>
            <span className="cifra mr-1.5 text-sello">2</span>Si no puede escanearlo, ingrese esta clave a mano:
            <code className="cifra mt-1.5 block bg-papel-hondo px-2 py-1.5 text-[0.8rem] break-all text-tinta select-all">
              {secretoEnGrupos}
            </code>
          </li>
          <li>
            <span className="cifra mr-1.5 text-sello">3</span>Escriba abajo el código que aparece en la app.
          </li>
        </ol>
      </div>

      <div className="mt-6 grid gap-4" aria-live="polite">
        {error && <Aviso titulo="No se pudo activar">{error}</Aviso>}
      </div>

      <div className="mt-6">
        <label htmlFor={`${id}-codigo`} className="rotulo">
          Código de la app
        </label>
        <input
          id={`${id}-codigo`}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${CLASE_CAMPO} text-center text-3xl tracking-[0.5em]`}
        />
      </div>

      <BotonPrincipal enviando={enviando} texto="Activar" textoEnviando="Activando…" />
    </form>
  )
}

function PasoCodigos({
  codigos,
  usuario,
  onListo,
}: {
  codigos: string[]
  usuario: UsuarioPublico
  onListo: () => void
}) {
  const [guardados, setGuardados] = useState(false)
  const [copiados, setCopiados] = useState(false)
  const texto = [
    `Códigos de recuperación · ${usuario.nombre_usuario}`,
    'Cada código sirve una sola vez para entrar sin el teléfono.',
    '',
    ...codigos,
  ].join('\n')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiados(true)
    } catch {
      setCopiados(false)
    }
  }

  function descargar() {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `codigos-recuperacion-${usuario.nombre_usuario}.txt`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Progreso actual={3} />
      <EncabezadoTarjeta rotulo="Verificación activada" titulo="Guarde estos códigos">
        Si pierde el teléfono, son la única forma de entrar. Se muestran <strong>solo esta vez</strong>:
        guárdelos en un gestor de contraseñas o imprímalos y téngalos en un lugar seguro.
      </EncabezadoTarjeta>

      <ul className="cifra mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-linea py-4 text-[0.95rem] sm:text-base">
        {codigos.map((codigo) => (
          <li key={codigo} className="select-all">
            {codigo}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button type="button" onClick={copiar} className="border border-tinta px-3 py-1.5 hover:bg-tinta hover:text-papel">
          {copiados ? 'Copiados' : 'Copiar'}
        </button>
        <button type="button" onClick={descargar} className="border border-tinta px-3 py-1.5 hover:bg-tinta hover:text-papel">
          Descargar .txt
        </button>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-sm text-tinta-media">
        <input
          type="checkbox"
          checked={guardados}
          onChange={(e) => setGuardados(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-tinta"
        />
        Guardé los códigos en un lugar seguro.
      </label>

      <BotonPrincipal tipo="button" texto="Ingresar de nuevo" deshabilitado={!guardados} onClick={onListo} />
    </div>
  )
}
