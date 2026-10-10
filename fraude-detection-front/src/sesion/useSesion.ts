import { useCallback, useEffect, useState } from 'react'

import { api, alExpirarSesion, ErrorApi, type Credenciales, type UsuarioPublico } from '../api'

export type EstadoSesion =
  | { fase: 'verificando' }
  | { fase: 'anonima'; aviso?: string }
  | { fase: 'activa'; usuario: UsuarioPublico }

/**
 * La sesión vive en una cookie HttpOnly que JavaScript no puede leer: el único modo de saber
 * si existe es preguntarle al servidor (GET /auth/sesion) y escuchar los 401 posteriores.
 */
export function useSesion() {
  const [estado, setEstado] = useState<EstadoSesion>({ fase: 'verificando' })

  useEffect(() => {
    const control = new AbortController()
    api.auth
      .sesionActual(control.signal)
      .then((sesion) => setEstado({ fase: 'activa', usuario: sesion.usuario }))
      .catch((error: unknown) => {
        if (error instanceof ErrorApi && error.tipo === 'cancelada') return
        const sinConexion = error instanceof ErrorApi && error.estado === null
        setEstado({
          fase: 'anonima',
          aviso: sinConexion ? 'No fue posible contactar al servidor. Verifique su conexión.' : undefined,
        })
      })

    const darDeBaja = alExpirarSesion(() =>
      setEstado({ fase: 'anonima', aviso: 'Su sesión expiró o fue cerrada. Ingrese nuevamente.' }),
    )
    return () => {
      control.abort()
      darDeBaja()
    }
  }, [])

  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const sesion = await api.auth.iniciarSesion(credenciales)
    setEstado({ fase: 'activa', usuario: sesion.usuario })
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await api.auth.cerrarSesion()
    } finally {
      setEstado({ fase: 'anonima' })
    }
  }, [])

  return { estado, iniciarSesion, cerrarSesion }
}
