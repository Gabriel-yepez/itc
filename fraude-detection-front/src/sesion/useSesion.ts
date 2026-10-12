import { useCallback, useEffect, useState } from 'react'

import { api, alExpirarSesion, ErrorApi, type Credenciales, type UsuarioPublico } from '../api'

/** Mensaje que la pantalla de ingreso muestra al llegar a ella (sesión vencida, cambio de clave...). */
export interface AvisoSesion {
  tipo: 'advertencia' | 'info'
  titulo: string
  mensaje: string
}

export type EstadoSesion =
  | { fase: 'verificando' }
  | { fase: 'anonima'; aviso?: AvisoSesion }
  /** Contraseña correcta; falta el código de la app de autenticación. */
  | { fase: 'segundo_factor' }
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
          aviso: sinConexion
            ? {
                tipo: 'advertencia',
                titulo: 'Sin conexión',
                mensaje: 'No fue posible contactar al servidor. Verifique su conexión.',
              }
            : undefined,
        })
      })

    const darDeBaja = alExpirarSesion(() =>
      setEstado({
        fase: 'anonima',
        aviso: {
          tipo: 'advertencia',
          titulo: 'Sesión finalizada',
          mensaje: 'Su sesión expiró o fue cerrada. Ingrese nuevamente.',
        },
      }),
    )
    return () => {
      control.abort()
      darDeBaja()
    }
  }, [])

  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const respuesta = await api.auth.iniciarSesion(credenciales)
    setEstado(
      respuesta.segundo_factor_requerido || !respuesta.usuario
        ? { fase: 'segundo_factor' }
        : { fase: 'activa', usuario: respuesta.usuario },
    )
  }, [])

  const verificarSegundoFactor = useCallback(async (codigo: string) => {
    const respuesta = await api.auth.verificarSegundoFactor(codigo)
    if (respuesta.usuario) setEstado({ fase: 'activa', usuario: respuesta.usuario })
  }, [])

  /** El intento con doble factor caducó o el usuario decidió volver a empezar. */
  const reiniciarIngreso = useCallback((aviso?: AvisoSesion) => {
    setEstado({ fase: 'anonima', aviso })
  }, [])

  /** Activar el doble factor cierra todas las sesiones: se ingresa de nuevo, ya con código. */
  const segundoFactorActivado = useCallback(() => {
    setEstado({
      fase: 'anonima',
      aviso: {
        tipo: 'info',
        titulo: 'Verificación en dos pasos activada',
        mensaje: 'Ingrese de nuevo: tras la contraseña se le pedirá el código de su app.',
      },
    })
  }, [])

  /** Cambiar la contraseña revoca todas las sesiones: se vuelve a ingresar con la nueva. */
  const contrasenaCambiada = useCallback(() => {
    setEstado({
      fase: 'anonima',
      aviso: { tipo: 'info', titulo: 'Contraseña actualizada', mensaje: 'Ingrese con su nueva contraseña.' },
    })
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await api.auth.cerrarSesion()
    } finally {
      setEstado({ fase: 'anonima' })
    }
  }, [])

  return {
    estado,
    iniciarSesion,
    verificarSegundoFactor,
    reiniciarIngreso,
    cerrarSesion,
    contrasenaCambiada,
    segundoFactorActivado,
  }
}
