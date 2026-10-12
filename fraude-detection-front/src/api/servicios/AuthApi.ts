import { ApiBase } from '../ApiBase'
import type {
  CambioContrasena,
  CodigosRecuperacion,
  ConfiguracionSegundoFactor,
  Credenciales,
  RespuestaInicio,
  RespuestaSesion,
} from '../tipos'

export class AuthApi extends ApiBase {
  /**
   * El servidor responde con la cookie de sesión (HttpOnly) y la cookie CSRF, o, si la cuenta
   * tiene doble factor, con `segundo_factor_requerido` y una cookie HttpOnly del intento.
   */
  iniciarSesion(credenciales: Credenciales): Promise<RespuestaInicio> {
    // Un 401 aquí significa credenciales incorrectas, no una sesión expirada.
    return this.post<RespuestaInicio, Credenciales>('/auth/login', credenciales, {
      notificarSesionExpirada: false,
    })
  }

  /** Segundo paso del login: código de la app de autenticación o uno de recuperación. */
  verificarSegundoFactor(codigo: string): Promise<RespuestaInicio> {
    return this.post<RespuestaInicio, { codigo: string }>(
      '/auth/segundo-factor',
      { codigo },
      { notificarSesionExpirada: false },
    )
  }

  /** Genera el secreto y el QR; queda pendiente hasta activarlo con un código. */
  configurarSegundoFactor(contrasena: string): Promise<ConfiguracionSegundoFactor> {
    return this.post<ConfiguracionSegundoFactor, { contrasena: string }>(
      '/auth/segundo-factor/configurar',
      { contrasena },
      { notificarSesionExpirada: false },
    )
  }

  /** Devuelve los códigos de recuperación (única vez) y cierra todas las sesiones. */
  activarSegundoFactor(codigo: string): Promise<CodigosRecuperacion> {
    return this.post<CodigosRecuperacion, { codigo: string }>(
      '/auth/segundo-factor/activar',
      { codigo },
      { notificarSesionExpirada: false },
    )
  }

  cerrarSesion(): Promise<void> {
    return this.post<void>('/auth/logout')
  }

  /** Útil al cargar la app para saber si ya hay una sesión válida (lanza 401 si no). */
  sesionActual(signal?: AbortSignal): Promise<RespuestaSesion> {
    return this.get<RespuestaSesion>('/auth/sesion', { signal, notificarSesionExpirada: false })
  }

  /** Cierra todas las sesiones del usuario, incluida la actual. */
  cambiarContrasena(datos: CambioContrasena): Promise<void> {
    return this.post<void, CambioContrasena>('/auth/cambiar-contrasena', datos)
  }
}
