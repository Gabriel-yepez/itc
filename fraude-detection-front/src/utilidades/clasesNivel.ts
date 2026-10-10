import type { NivelRiesgo } from '../api'

/** Clases completas por nivel (Tailwind solo genera clases que aparecen literalmente en el código). */
export const COLOR_NIVEL: Record<NivelRiesgo, string> = {
  bajo: 'text-riesgo-bajo border-riesgo-bajo',
  medio: 'text-riesgo-medio border-riesgo-medio',
  alto: 'text-riesgo-alto border-riesgo-alto',
  critico: 'text-riesgo-critico border-riesgo-critico',
}

export const FONDO_NIVEL: Record<NivelRiesgo, string> = {
  bajo: 'bg-riesgo-bajo',
  medio: 'bg-riesgo-medio',
  alto: 'bg-riesgo-alto',
  critico: 'bg-riesgo-critico',
}
