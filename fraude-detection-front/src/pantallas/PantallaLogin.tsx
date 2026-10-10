import { useId, useState, type CSSProperties, type FormEvent } from 'react'

import { ErrorApi, type Credenciales, type ErrorValidacion } from '../api'
import { Aviso } from '../componentes/Aviso'
import { Marca } from '../componentes/Marca'
import { porcentaje } from '../utilidades/formato'

const BENFORD = Array.from({ length: 9 }, (_, i) => {
  const digito = i + 1
  return { digito, probabilidad: Math.log10(1 + 1 / digito) }
})
const MAXIMO = BENFORD[0].probabilidad

interface Props {
  aviso?: string
  onIniciarSesion: (credenciales: Credenciales) => Promise<void>
}

export function PantallaLogin({ aviso, onIniciarSesion }: Props) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <PanelBenford />
      {/* En pantallas pequeñas el formulario va primero: ingresar no debe requerir scroll. */}
      <section className="order-first flex items-center justify-center px-6 py-12 sm:px-10 lg:order-none lg:py-14">
        <FormularioAcceso aviso={aviso} onIniciarSesion={onIniciarSesion} />
      </section>
    </main>
  )
}

/** La ley que da sentido a la herramienta, dibujada: el 1 encabeza el 30 % de los montos reales. */
function PanelBenford() {
  return (
    <section className="relative isolate flex flex-col overflow-hidden bg-tinta px-7 py-8 text-papel sm:px-12 lg:min-h-screen lg:px-14 lg:py-12">
      {/* Renglones de libro contable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,rgb(242_237_227/0.05)_35px,rgb(242_237_227/0.05)_36px)]"
      />
      <div aria-hidden="true" className="grano absolute inset-0 -z-10 opacity-60 mix-blend-screen" />

      <div className="hidden lg:block">
        <Marca claro />
      </div>

      <div className="max-w-xl lg:mt-auto">
        <p className="rotulo text-papel/60">Ley de Benford</p>
        <h2 className="mt-3 animate-aparecer font-serif text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl">
          Uno de cada tres montos debería empezar por <em className="text-sello">1</em>.
        </h2>
        <p className="mt-5 max-w-md animate-aparecer text-papel/70 [animation-delay:120ms]">
          En operaciones bancarias reales, los primeros dígitos siguen una curva predecible. Cuando
          alguien fabrica cifras, la curva se rompe — y eso es lo que medimos.
        </p>
      </div>

      <figure className="mt-10 lg:mt-14" aria-label="Distribución del primer dígito según la Ley de Benford">
        <div className="flex h-48 items-end gap-2 sm:h-56 sm:gap-3">
          {BENFORD.map(({ digito, probabilidad }) => (
            <div key={digito} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="cifra text-[0.68rem] text-papel/70">{porcentaje(probabilidad)}</span>
              <div
                style={{ '--alto': `${(probabilidad / MAXIMO) * 100}%`, '--i': digito } as CSSProperties}
                className={`h-(--alto) w-full origin-bottom animate-crecer [animation-delay:calc(var(--i)*70ms_+_200ms)] ${
                  digito === 1 ? 'bg-sello' : 'bg-papel/85'
                }`}
              />
              <span className={`font-serif text-2xl leading-none ${digito === 1 ? 'text-sello' : ''}`}>
                {digito}
              </span>
            </div>
          ))}
        </div>
        <figcaption className="mt-5 flex flex-wrap justify-between gap-2 border-t border-papel/15 pt-3 font-mono text-[0.68rem] tracking-wider text-papel/50">
          <span>P(d) = log₁₀(1 + 1/d)</span>
          <span>Newcomb, 1881 · Benford, 1938</span>
        </figcaption>
      </figure>
    </section>
  )
}

function FormularioAcceso({ aviso, onIniciarSesion }: Props) {
  const id = useId()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ mensaje: string; validaciones: readonly ErrorValidacion[] } | null>(
    null,
  )

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    if (!usuario.trim() || !contrasena) {
      setError({ mensaje: 'Ingrese su usuario y su contraseña.', validaciones: [] })
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await onIniciarSesion({ usuario: usuario.trim(), contrasena })
    } catch (causa) {
      const e = causa instanceof ErrorApi ? causa : null
      setError({ mensaje: e?.message ?? 'No fue posible iniciar sesión.', validaciones: e?.validaciones ?? [] })
      setContrasena('')
      setEnviando(false)
    }
  }

  const campo =
    'w-full border-0 border-b border-linea-fuerte bg-transparent px-0 py-2 text-lg text-tinta transition-colors placeholder:text-tinta-suave/50 focus:border-tinta focus:outline-none'

  return (
    <form onSubmit={enviar} noValidate className="w-full max-w-sm animate-aparecer [animation-delay:150ms]">
      <div className="mb-10 lg:hidden">
        <Marca />
      </div>
      <p className="rotulo flex items-center gap-2">
        <span className="inline-block size-1.5 rounded-full bg-sello" aria-hidden="true" />
        Acceso restringido
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-none tracking-tight">Iniciar sesión</h1>
      <p className="mt-3 text-tinta-suave">Use las credenciales asignadas por el administrador del sistema.</p>

      <div className="mt-8 grid gap-4" aria-live="polite">
        {aviso && !error && (
          <Aviso tipo="advertencia" titulo="Sesión finalizada">
            {aviso}
          </Aviso>
        )}
        {error && (
          <Aviso titulo="No se pudo ingresar" validaciones={error.validaciones}>
            {error.mensaje}
          </Aviso>
        )}
      </div>

      <div className="mt-6 grid gap-7">
        <div>
          <label htmlFor={`${id}-usuario`} className="rotulo">
            Usuario
          </label>
          <input
            id={`${id}-usuario`}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={64}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={campo}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`${id}-contrasena`} className="rotulo">
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => setVerContrasena((v) => !v)}
              aria-pressed={verContrasena}
              aria-controls={`${id}-contrasena`}
              className="font-mono text-[0.68rem] tracking-wider text-tinta-suave uppercase underline-offset-4 hover:text-tinta hover:underline"
            >
              {verContrasena ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <input
            id={`${id}-contrasena`}
            name="password"
            type={verContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            required
            maxLength={128}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className={`${campo} cifra`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="group mt-10 flex w-full items-center justify-between bg-tinta px-5 py-3.5 text-papel transition-colors duration-300 hover:bg-sello disabled:cursor-wait disabled:opacity-70"
      >
        <span className="font-medium tracking-wide">{enviando ? 'Verificando…' : 'Ingresar'}</span>
        <span aria-hidden="true" className="font-mono transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </button>

      <p className="mt-8 flex gap-2 border-t border-linea pt-4 text-xs leading-relaxed text-tinta-suave">
        <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 fill-none stroke-current" aria-hidden="true">
          <rect x="3" y="7" width="10" height="7" rx="1" strokeWidth="1.4" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeWidth="1.4" />
        </svg>
        Sesión protegida con cookie HttpOnly. Se cierra sola tras 30 minutos de inactividad.
      </p>
    </form>
  )
}
