import type { Canal, Conformidad, CriterioAgrupacion, NivelRiesgo, PruebaBenford } from '../api'

export const NIVEL: Record<NivelRiesgo, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
  critico: 'Riesgo crítico',
}

export const NIVEL_CORTO: Record<NivelRiesgo, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Crítico',
}

export const CONFORMIDAD: Record<Conformidad, string> = {
  cercana: 'Conformidad cercana',
  aceptable: 'Conformidad aceptable',
  marginal: 'Conformidad marginal',
  no_conformidad: 'No conforme',
  no_aplica: 'Sin referencia MAD',
}

export const PRUEBA: Record<PruebaBenford, string> = {
  primer_digito: 'Primer dígito',
  segundo_digito: 'Segundo dígito',
  primeros_dos_digitos: 'Primeros dos dígitos',
  ultimos_dos_digitos: 'Últimos dos dígitos',
}

export const CANAL: Record<Canal, string> = {
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  punto_de_venta: 'Punto de venta',
  biopago: 'Biopago',
  efectivo: 'Efectivo',
  divisas: 'Divisas',
  criptoactivos: 'Criptoactivos',
  otro: 'Otro',
}

export const AGRUPACION: Record<CriterioAgrupacion, string> = {
  cuenta: 'Por cuenta',
  canal: 'Por canal',
}

const MOTIVOS_EXCLUSION: Record<string, string> = {
  canal_no_seleccionado: 'Canal no incluido en el perfil',
  tipo_no_seleccionado: 'Tipo de operación no incluido',
  sin_tasa_de_cambio: 'Sin tasa BCV para convertir',
  bajo_monto_minimo: 'Por debajo del monto mínimo',
  sobre_monto_maximo: 'Por encima del monto máximo',
}

export const motivoExclusion = (clave: string): string => MOTIVOS_EXCLUSION[clave] ?? clave.replaceAll('_', ' ')
