import { ApiBase } from '../ApiBase'
import type { CambiosPerfil, NuevoPerfil, ParametrosDeteccion, PerfilDeteccion } from '../tipos'

export class PerfilesApi extends ApiBase {
  listar(signal?: AbortSignal): Promise<PerfilDeteccion[]> {
    return this.get<PerfilDeteccion[]>('/perfiles', { signal })
  }

  obtener(id: number, signal?: AbortSignal): Promise<PerfilDeteccion> {
    return this.get<PerfilDeteccion>('/perfiles/:id', { parametrosRuta: { id }, signal })
  }

  /** Parámetros sugeridos para banca venezolana (plantilla para un perfil nuevo). */
  parametrosReferencia(signal?: AbortSignal): Promise<ParametrosDeteccion> {
    return this.get<ParametrosDeteccion>('/perfiles/parametros/referencia', { signal })
  }

  /** JSON Schema de los parámetros (descripciones, rangos, valores por defecto) para formularios. */
  esquemaParametros(signal?: AbortSignal): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/perfiles/parametros/esquema', { signal })
  }

  /** Requiere rol admin. */
  crear(perfil: NuevoPerfil): Promise<PerfilDeteccion> {
    return this.post<PerfilDeteccion, NuevoPerfil>('/perfiles', perfil)
  }

  /** Requiere rol admin. Los parámetros se combinan con los actuales del perfil. */
  actualizar(id: number, cambios: CambiosPerfil): Promise<PerfilDeteccion> {
    return this.patch<PerfilDeteccion, CambiosPerfil>('/perfiles/:id', cambios, { parametrosRuta: { id } })
  }

  /** Requiere rol admin. No se puede eliminar el perfil predeterminado. */
  eliminar(id: number): Promise<void> {
    return this.delete('/perfiles/:id', { parametrosRuta: { id } })
  }
}
