import { ApiBase } from '../ApiBase'
import { CONFIG_API } from '../config'
import type { Analisis, OpcionesAnalisisCsv, Paginacion, ResumenAnalisis, SolicitudAnalisis } from '../tipos'

export class AnalisisApi extends ApiBase {
  /** Ejecuta las pruebas de Benford sobre las transacciones enviadas. */
  analizar(solicitud: SolicitudAnalisis, signal?: AbortSignal): Promise<Analisis> {
    return this.post<Analisis, SolicitudAnalisis>('/analisis', solicitud, {
      signal,
      tiempoEsperaMs: CONFIG_API.tiempoEsperaArchivosMs,
    })
  }

  /** Sube un extracto CSV (p. ej. con montos "1.234,56" y separador ";"). */
  analizarCsv(archivo: File, opciones: OpcionesAnalisisCsv = {}, signal?: AbortSignal): Promise<Analisis> {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    if (opciones.perfilId !== undefined) formulario.append('perfil_id', String(opciones.perfilId))
    if (opciones.parametros) formulario.append('parametros', JSON.stringify(opciones.parametros))
    if (opciones.formato) formulario.append('formato', JSON.stringify(opciones.formato))
    if (opciones.descripcion) formulario.append('descripcion', opciones.descripcion)
    if (opciones.guardar !== undefined) formulario.append('guardar', String(opciones.guardar))

    // Con FormData axios deja que el navegador ponga el Content-Type multipart con su boundary.
    return this.post<Analisis, FormData>('/analisis/csv', formulario, {
      signal,
      tiempoEsperaMs: CONFIG_API.tiempoEsperaArchivosMs,
    })
  }

  /** Historial: los analistas ven los suyos; los administradores, todos. */
  listar({ limite = 50, desplazamiento = 0 }: Paginacion = {}, signal?: AbortSignal): Promise<ResumenAnalisis[]> {
    return this.get<ResumenAnalisis[]>('/analisis', { params: { limite, desplazamiento }, signal })
  }

  obtener(id: number, signal?: AbortSignal): Promise<Analisis> {
    return this.get<Analisis>('/analisis/:id', { parametrosRuta: { id }, signal })
  }
}
