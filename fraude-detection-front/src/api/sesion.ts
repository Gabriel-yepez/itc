/**
 * Aviso de sesión expirada (401). La sesión vive en una cookie HttpOnly que JavaScript
 * no puede leer, así que la única señal de que expiró es la respuesta del servidor.
 */

type Oyente = () => void

const oyentes = new Set<Oyente>()

/** Registra un oyente (p. ej. redirigir al login). Devuelve la función para darlo de baja. */
export function alExpirarSesion(oyente: Oyente): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function notificarSesionExpirada(): void {
  for (const oyente of oyentes) oyente()
}
