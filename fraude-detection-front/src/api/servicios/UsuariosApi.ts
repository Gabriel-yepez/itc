import { ApiBase } from '../ApiBase'
import type { CambiosUsuario, NuevoUsuario, UsuarioPublico } from '../tipos'

/** Requiere rol admin. */
export class UsuariosApi extends ApiBase {
  listar(signal?: AbortSignal): Promise<UsuarioPublico[]> {
    return this.get<UsuarioPublico[]>('/usuarios', { signal })
  }

  crear(usuario: NuevoUsuario): Promise<UsuarioPublico> {
    return this.post<UsuarioPublico, NuevoUsuario>('/usuarios', usuario)
  }

  /** Para quien perdió el teléfono: lo hace otro administrador y genera una alerta crítica. */
  restablecerSegundoFactor(id: number): Promise<UsuarioPublico> {
    return this.post<UsuarioPublico>('/usuarios/:id/restablecer-segundo-factor', undefined, {
      parametrosRuta: { id },
    })
  }

  /** Cambiar el rol o desactivar revoca las sesiones abiertas del usuario. */
  actualizar(id: number, cambios: CambiosUsuario): Promise<UsuarioPublico> {
    return this.patch<UsuarioPublico, CambiosUsuario>('/usuarios/:id', cambios, { parametrosRuta: { id } })
  }
}
