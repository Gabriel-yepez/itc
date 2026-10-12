import { ApiBase } from '../ApiBase'
import type { EventoAuditoria } from '../tipos'

/** Requiere rol admin. */
export class AuditoriaApi extends ApiBase {
  /** Más reciente primero. `soloAlertas`: advertencias y críticos. */
  listar(
    opciones: { soloAlertas?: boolean; limite?: number; desplazamiento?: number } = {},
    signal?: AbortSignal,
  ): Promise<EventoAuditoria[]> {
    const { soloAlertas = false, limite = 50, desplazamiento = 0 } = opciones
    return this.get<EventoAuditoria[]>('/auditoria', {
      params: { solo_alertas: soloAlertas, limite, desplazamiento },
      signal,
    })
  }
}
