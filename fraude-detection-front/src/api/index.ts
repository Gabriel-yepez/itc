import { AnalisisApi } from './servicios/AnalisisApi'
import { AuthApi } from './servicios/AuthApi'
import { PerfilesApi } from './servicios/PerfilesApi'
import { UsuariosApi } from './servicios/UsuariosApi'

/**
 * Punto de entrada de la capa API.
 *
 *   import { api, ErrorApi } from './api'
 *   const sesion = await api.auth.iniciarSesion({ usuario, contrasena })
 *   const analisis = await api.analisis.analizar({ transacciones })
 */
export const api = Object.freeze({
  auth: new AuthApi(),
  usuarios: new UsuariosApi(),
  perfiles: new PerfilesApi(),
  analisis: new AnalisisApi(),
})

export { ApiBase, construirRuta } from './ApiBase'
export type { MetodoHttp, OpcionesPeticion, ParametrosConsulta, ParametrosRuta, Peticion } from './ApiBase'
export { clienteHttp, crearClienteHttp } from './clienteHttp'
export { CONFIG_API } from './config'
export { ErrorApi, normalizarError } from './errores'
export type { ErrorValidacion, TipoErrorApi } from './errores'
export { alExpirarSesion } from './sesion'
export { AnalisisApi, AuthApi, PerfilesApi, UsuariosApi }
export type * from './tipos'
