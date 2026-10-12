import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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
import { Auditoria } from './Auditoria'
import { Expediente } from './Expediente'
import { FormularioAnalisis, type Pedido } from './FormularioAnalisis'
import { Recientes } from './Recientes'

/** Por debajo de `lg` el formulario y el archivo no caben lado a lado: se alternan con pestañas. */
type Vista = 'formulario' | 'archivo'

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
  const [seccion, setSeccion] = useState<'analisis' | 'auditoria'>('analisis')
  const esAdmin = usuario.rol === 'admin'
  const [vista, setVista] = useState<Vista>('formulario')
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
    // En móvil el progreso, el error y el resultado viven en la pestaña de archivo.
    mostrar('archivo')
    try {
      const resultado =
        pedido.tipo === 'csv'
          ? await api.analisis.analizarCsv(pedido.archivo, pedido.opciones, actual.signal)
          : await api.analisis.analizar(pedido.solicitud, actual.signal)
      setAnalisis(resultado)
      mostrar('archivo')
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

  function mostrar(destino: Vista) {
    setVista(destino)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelar() {
    control.current?.abort()
  }

  async function abrir(id: number) {
    setAbriendoId(id)
    setError(null)
    try {
      setAnalisis(await api.analisis.obtener(id))
      mostrar('archivo')
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
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Marca />
          <div className="flex items-center gap-3 sm:gap-5">
            {esAdmin && (
              <button
                type="button"
                onClick={() => setSeccion((s) => (s === 'auditoria' ? 'analisis' : 'auditoria'))}
                aria-pressed={seccion === 'auditoria'}
                className="min-h-9 px-1 text-sm text-tinta-suave underline-offset-4 hover:text-tinta hover:underline aria-pressed:text-tinta aria-pressed:underline"
              >
                {seccion === 'auditoria' ? '← Análisis' : 'Auditoría'}
              </button>
            )}
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{usuario.nombre_usuario}</p>
              <p className="rotulo text-[0.62rem]">{usuario.rol === 'admin' ? 'Administrador' : 'Analista'}</p>
            </div>
            <span
              aria-hidden="true"
              title={usuario.nombre_usuario}
              className="grid size-8 place-items-center rounded-full bg-tinta font-mono text-xs text-papel uppercase sm:hidden"
            >
              {usuario.nombre_usuario.slice(0, 2)}
            </span>
            <button
              type="button"
              onClick={salir}
              disabled={cerrando}
              className="min-h-9 border border-tinta px-3 py-1.5 text-sm transition-colors hover:bg-tinta hover:text-papel disabled:opacity-60 sm:px-3.5"
            >
              {cerrando ? 'Cerrando…' : <><span className="sm:hidden">Salir</span><span className="hidden sm:inline">Cerrar sesión</span></>}
            </button>
          </div>
        </div>
        {seccion === 'analisis' && (
          <nav
            aria-label="Secciones"
            className="mx-auto grid max-w-xl grid-cols-2 border-t border-linea px-4 sm:px-6 lg:hidden"
          >
            <PestanaVista activa={vista === 'formulario'} onClick={() => mostrar('formulario')}>
              Nuevo análisis
            </PestanaVista>
            <PestanaVista activa={vista === 'archivo'} onClick={() => mostrar('archivo')} aviso={enCurso !== null}>
              {analisis ? 'Resultado' : 'Archivo'}
              {!analisis && recientes && recientes.length > 0 && (
                <span className="cifra ml-1.5 text-xs text-tinta-suave">{recientes.length}</span>
              )}
            </PestanaVista>
          </nav>
        )}
      </header>

      {seccion === 'auditoria' ? (
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <Auditoria />
        </main>
      ) : (
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)]">
          <aside
            className={`border-linea bg-papel-claro/50 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r ${
              vista === 'formulario' ? '' : 'hidden'
            }`}
          >
            <FormularioAnalisis
              perfiles={perfiles}
              ejecutando={enCurso !== null}
              onEnviar={ejecutar}
              onCancelar={cancelar}
            />
          </aside>

          <main
            className={`min-w-0 px-4 py-7 sm:px-6 lg:block lg:px-10 lg:py-10 ${vista === 'archivo' ? '' : 'hidden'}`}
            aria-live="polite"
          >
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
      )}
    </div>
  )
}

function PestanaVista({
  activa,
  aviso = false,
  onClick,
  children,
}: {
  activa: boolean
  aviso?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? 'page' : undefined}
      className={`relative -mb-px flex min-h-11 items-center justify-center border-b-2 text-sm transition-colors ${
        activa ? 'border-sello font-medium text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'
      }`}
    >
      {children}
      {aviso && <span className="ml-2 size-1.5 animate-pulse rounded-full bg-sello" aria-label="en curso" />}
    </button>
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
