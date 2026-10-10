import { useCallback, useEffect, useRef, useState } from 'react'

import {
  api,
  ErrorApi,
  normalizarError,
  type Analisis,
  type PerfilDeteccion,
  type ResumenAnalisis,
  type UsuarioPublico,
} from '../../api'
import { Aviso } from '../../componentes/Aviso'
import { Marca } from '../../componentes/Marca'
import { Expediente } from './Expediente'
import { FormularioAnalisis, type Pedido } from './FormularioAnalisis'
import { Recientes } from './Recientes'

interface Props {
  usuario: UsuarioPublico
  onCerrarSesion: () => Promise<void>
}

export function PantallaAnalisis({ usuario, onCerrarSesion }: Props) {
  const [perfiles, setPerfiles] = useState<PerfilDeteccion[]>([])
  const [recientes, setRecientes] = useState<ResumenAnalisis[] | null>(null)
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [abriendoId, setAbriendoId] = useState<number | null>(null)
  const [error, setError] = useState<ErrorApi | null>(null)
  const [cerrando, setCerrando] = useState(false)
  const control = useRef<AbortController | null>(null)

  const cargarRecientes = useCallback((signal?: AbortSignal) => {
    api.analisis
      .listar({ limite: 25 }, signal)
      .then(setRecientes)
      .catch((e: unknown) => {
        const causa = normalizarError(e)
        if (causa.tipo !== 'cancelada') setError(causa)
      })
  }, [])

  useEffect(() => {
    const inicial = new AbortController()
    api.perfiles
      .listar(inicial.signal)
      .then(setPerfiles)
      .catch((e: unknown) => {
        const causa = normalizarError(e)
        if (causa.tipo !== 'cancelada') setError(causa)
      })
    cargarRecientes(inicial.signal)
    return () => {
      inicial.abort()
      control.current?.abort()
    }
  }, [cargarRecientes])

  async function ejecutar(pedido: Pedido) {
    control.current?.abort()
    const actual = new AbortController()
    control.current = actual
    setEnCurso(pedido.etiqueta)
    setError(null)
    try {
      const resultado =
        pedido.tipo === 'csv'
          ? await api.analisis.analizarCsv(pedido.archivo, pedido.opciones, actual.signal)
          : await api.analisis.analizar(pedido.solicitud, actual.signal)
      setAnalisis(resultado)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (resultado.id !== null) cargarRecientes()
    } catch (e) {
      const causa = normalizarError(e)
      if (causa.tipo !== 'cancelada') setError(causa)
    } finally {
      if (control.current === actual) {
        control.current = null
        setEnCurso(null)
      }
    }
  }

  function cancelar() {
    control.current?.abort()
  }

  async function abrir(id: number) {
    setAbriendoId(id)
    setError(null)
    try {
      setAnalisis(await api.analisis.obtener(id))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(normalizarError(e))
    } finally {
      setAbriendoId(null)
    }
  }

  async function salir() {
    setCerrando(true)
    control.current?.abort()
    await onCerrarSesion()
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-linea bg-papel/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-5 lg:px-8">
          <Marca />
          <div className="flex items-center gap-5">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{usuario.nombre_usuario}</p>
              <p className="rotulo text-[0.62rem]">{usuario.rol === 'admin' ? 'Administrador' : 'Analista'}</p>
            </div>
            <button
              type="button"
              onClick={salir}
              disabled={cerrando}
              className="border border-tinta px-3.5 py-1.5 text-sm transition-colors hover:bg-tinta hover:text-papel disabled:opacity-60"
            >
              {cerrando ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="border-linea bg-papel-claro/50 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r">
          <FormularioAnalisis
            perfiles={perfiles}
            ejecutando={enCurso !== null}
            onEnviar={ejecutar}
            onCancelar={cancelar}
          />
        </aside>

        <main className="min-w-0 px-5 py-8 lg:px-10 lg:py-10" aria-live="polite">
          {enCurso && <Procesando etiqueta={enCurso} onCancelar={cancelar} />}
          {error && (
            <div className="mb-8">
              <Aviso titulo="La operación no se completó" validaciones={error.validaciones}>
                {error.message}
              </Aviso>
            </div>
          )}
          {analisis ? (
            <Expediente
              key={`${analisis.id}-${analisis.creado_en}`}
              analisis={analisis}
              perfiles={perfiles}
              onVolver={() => setAnalisis(null)}
            />
          ) : (
            <Recientes recientes={recientes} abriendoId={abriendoId} onAbrir={abrir} />
          )}
        </main>
      </div>
    </div>
  )
}

function Procesando({ etiqueta, onCancelar }: { etiqueta: string; onCancelar: () => void }) {
  return (
    <div className="mb-8 animate-aparecer border border-tinta bg-papel-claro" role="status">
      <div className="relative h-1 overflow-hidden bg-linea">
        <div className="absolute inset-y-0 w-2/5 animate-barrido bg-sello" />
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="rotulo">En curso</p>
          <p className="mt-0.5 font-serif text-2xl">{etiqueta}</p>
        </div>
        <button type="button" onClick={onCancelar} className="text-sm text-tinta-suave underline underline-offset-4 hover:text-sello">
          Cancelar
        </button>
      </div>
    </div>
  )
}
