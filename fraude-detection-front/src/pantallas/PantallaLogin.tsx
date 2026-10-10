import { useId, useState, type CSSProperties, type FormEvent } from 'react'

import { ErrorApi, type Credenciales, type ErrorValidacion } from '../api'
import { Aviso } from '../componentes/Aviso'
import { Marca } from '../componentes/Marca'
import { decimal, porcentaje } from '../utilidades/formato'

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
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.15fr_1fr]">
      <PanelBenford />
      <CabeceraCompacta />
      {/* Móvil y tablet: el formulario es una tarjeta que monta sobre la cabecera; nada de scroll para ingresar. */}
      <section className="relative z-10 -mt-10 px-4 pb-10 sm:-mt-14 sm:px-8 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-14">
        <div className="mx-auto w-full max-w-md animate-aparecer border border-linea bg-papel-claro px-6 pt-7 pb-8 shadow-[0_28px_50px_-30px_rgb(23_20_15/0.5)] [animation-delay:120ms] sm:px-10 sm:pt-9 sm:pb-10 lg:max-w-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <FormularioAcceso aviso={aviso} onIniciarSesion={onIniciarSesion} />
        </div>
        <ComoFunciona />
      </section>
    </main>
  )
}

function ParrafoMetodo({ className = '' }: { className?: string }) {
  return (
    <p className={className}>
      En operaciones bancarias reales, los primeros dígitos siguen una curva predecible: la Ley de Benford.
      Cuando alguien fabrica cifras, la curva se rompe — y eso es lo que medimos.
    </p>
  )
}

/** Distribución del primer dígito con porcentajes; `oscuro` para el panel negro, claro para fondos de papel. */
function BarrasBenford({ oscuro = false, className = '' }: { oscuro?: boolean; className?: string }) {
  return (
    <div className={`flex items-end ${className}`}>
      {BENFORD.map(({ digito, probabilidad }) => (
        <div key={digito} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className={`cifra text-[0.62rem] whitespace-nowrap sm:text-[0.68rem] ${oscuro ? 'text-papel/70' : 'text-tinta-suave'}`}>
            {/* En el panel compacto el «%» va en la leyenda: en barras angostas la etiqueta se partía. */}
            {oscuro ? porcentaje(probabilidad) : decimal(probabilidad * 100, 1)}
          </span>
          <div
            style={{ '--alto': `${(probabilidad / MAXIMO) * 100}%`, '--i': digito } as CSSProperties}
            className={`h-(--alto) w-full origin-bottom animate-crecer [animation-delay:calc(var(--i)*70ms_+_200ms)] ${
              digito === 1 ? 'bg-sello' : oscuro ? 'bg-papel/85' : 'bg-tinta'
            }`}
          />
          <span className={`font-serif leading-none ${oscuro ? 'text-2xl' : 'text-lg'} ${digito === 1 ? 'text-sello' : ''}`}>
            {digito}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Escritorio: la ley que da sentido a la herramienta, dibujada a toda altura. */
function PanelBenford() {
  return (
    <section className="relative isolate hidden min-h-dvh flex-col overflow-hidden bg-tinta px-14 py-12 text-papel lg:flex">
      <Renglones />
      <Marca claro />

      <div className="mt-auto max-w-xl">
        <p className="rotulo text-papel/60">Cómo detectamos el fraude</p>
        <h2 className="mt-3 animate-aparecer font-serif text-6xl leading-[1.02] tracking-tight">
          Uno de cada tres montos debería empezar por <em className="text-sello">1</em>.
        </h2>
        <ParrafoMetodo className="mt-5 max-w-md animate-aparecer text-papel/70 [animation-delay:120ms]" />
      </div>

      <figure className="mt-14" aria-label="Distribución del primer dígito según la Ley de Benford">
        <BarrasBenford oscuro className="h-56 gap-3" />
        <figcaption className="mt-5 flex flex-wrap justify-between gap-2 border-t border-papel/15 pt-3 font-mono text-[0.68rem] tracking-wider text-papel/50">
          <span>P(d) = log₁₀(1 + 1/d)</span>
          <span>Newcomb, 1881 · Benford, 1938</span>
        </figcaption>
      </figure>
    </section>
  )
}

/** Móvil y tablet: franja oscura con la marca; la curva queda como firma visual, sin cifras. */
function CabeceraCompacta() {
  return (
    <header className="relative isolate overflow-hidden bg-tinta px-5 pt-6 pb-16 text-papel sm:px-8 sm:pt-8 sm:pb-24 lg:hidden">
      <Renglones />
      <div className="mx-auto flex max-w-md items-start justify-between gap-6">
        <div>
          <Marca claro />
          <p className="mt-3 max-w-[15rem] font-serif text-[1.35rem] leading-tight text-papel/85 sm:max-w-none sm:text-2xl">
            Revise extractos bancarios y detecte montos fabricados.
          </p>
        </div>
        <div aria-hidden="true" className="mt-1 flex h-14 w-20 shrink-0 items-end gap-[3px] opacity-90 sm:h-16 sm:w-24">
          {BENFORD.map(({ digito, probabilidad }) => (
            <div
              key={digito}
              style={{ '--alto': `${(probabilidad / MAXIMO) * 100}%`, '--i': digito } as CSSProperties}
              className={`h-(--alto) flex-1 origin-bottom animate-crecer [animation-delay:calc(var(--i)*50ms_+_150ms)] ${
                digito === 1 ? 'bg-sello' : 'bg-papel/70'
              }`}
            />
          ))}
        </div>
      </div>
    </header>
  )
}

/** Móvil y tablet: la explicación sigue disponible, pero plegada debajo del formulario. */
function ComoFunciona() {
  return (
    <details className="group mx-auto mt-6 w-full max-w-md border-y border-linea lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-1 text-tinta-media [&::-webkit-details-marker]:hidden">
        <span className="rotulo">¿Cómo detectamos el fraude?</span>
        <span aria-hidden="true" className="font-mono text-lg leading-none transition-transform duration-300 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="px-1 pb-6">
        <ParrafoMetodo className="text-sm leading-relaxed text-tinta-suave" />
        <figure className="mt-6" aria-label="Distribución del primer dígito según la Ley de Benford">
          <BarrasBenford className="h-36 gap-1.5 sm:gap-2" />
          <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-linea pt-2 font-mono text-[0.62rem] tracking-wider text-tinta-suave">
            <span>% de montos según su primer dígito</span>
            <span>P(d) = log₁₀(1 + 1/d)</span>
          </figcaption>
        </figure>
      </div>
    </details>
  )
}

function Renglones() {
  return (
    <>
      {/* Renglones de libro contable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,rgb(242_237_227/0.05)_35px,rgb(242_237_227/0.05)_36px)]"
      />
      <div aria-hidden="true" className="grano absolute inset-0 -z-10 opacity-60 mix-blend-screen" />
    </>
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
    'w-full border-0 border-b border-linea-fuerte bg-transparent px-0 py-2.5 text-lg text-tinta transition-colors placeholder:text-tinta-suave/50 focus:border-tinta focus:outline-none'

  return (
    <form onSubmit={enviar} noValidate className="w-full">
      <p className="rotulo flex items-center gap-2">
        <span className="inline-block size-1.5 rounded-full bg-sello" aria-hidden="true" />
        Acceso restringido
      </p>
      <h1 className="mt-3 font-serif text-[2.6rem] leading-none tracking-tight sm:text-5xl">Iniciar sesión</h1>
      <p className="mt-3 text-[0.95rem] text-tinta-suave sm:text-base">Use las credenciales asignadas por el administrador del sistema.</p>

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
              className="-my-2 -mr-2 px-2 py-2 font-mono text-[0.68rem] tracking-wider text-tinta-suave uppercase underline-offset-4 hover:text-tinta hover:underline"
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
        className="group mt-9 flex min-h-12 w-full items-center justify-between bg-tinta px-5 py-3.5 text-papel transition-colors duration-300 hover:bg-sello disabled:cursor-wait disabled:opacity-70"
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
