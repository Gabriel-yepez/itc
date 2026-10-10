import { ApiBase } from '../ApiBase'
import type { CambioContrasena, Credenciales, RespuestaSesion } from '../tipos'

export class AuthApi extends ApiBase {
  /** El servidor responde con la cookie de sesión (HttpOnly) y la cookie CSRF. */
  iniciarSesion(credenciales: Credenciales): Promise<RespuestaSesion> {
    // Un 401 aquí significa credenciales incorrectas, no una sesión expirada.
    return this.post<RespuestaSesion, Credenciales>('/auth/login', credenciales, {
      notificarSesionExpirada: false,
    })
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
