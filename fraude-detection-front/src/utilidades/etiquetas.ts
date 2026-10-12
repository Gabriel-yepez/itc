import type { Canal, Conformidad, CriterioAgrupacion, NivelRiesgo, PruebaBenford, Severidad } from '../api'

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

export const SEVERIDAD: Record<Severidad, string> = {
  info: 'Info',
  advertencia: 'Advertencia',
  critica: 'Crítica',
}

const TIPOS_EVENTO: Record<string, string> = {
  inicio_sesion: 'Inicio de sesión',
  inicio_sesion_fallido: 'Inicio de sesión fallido',
  cierre_sesion: 'Cierre de sesión',
  acceso_bloqueado: 'Acceso bloqueado por intentos fallidos',
  ataque_distribuido_a_cuenta: 'Ataque distribuido contra una cuenta',
  rociado_de_contrasenas: 'Rociado de contraseñas desde una IP',
  segundo_factor_fallido: 'Código de verificación incorrecto',
  codigo_recuperacion_usado: 'Código de recuperación usado',
  segundo_factor_configuracion_iniciada: 'Configuración de verificación iniciada',
  segundo_factor_activado: 'Verificación en dos pasos activada',
  segundo_factor_desactivado: 'Verificación en dos pasos desactivada',
  segundo_factor_restablecido: 'Verificación en dos pasos restablecida',
  usuario_creado: 'Usuario creado',
  usuario_actualizado: 'Usuario modificado',
  contrasena_cambiada: 'Contraseña cambiada',
  cambio_contrasena_fallido: 'Cambio de contraseña fallido',
  perfil_creado: 'Perfil de detección creado',
  perfil_actualizado: 'Perfil de detección modificado',
  perfil_eliminado: 'Perfil de detección eliminado',
  analisis_ejecutado: 'Análisis ejecutado',
  csrf_invalido: 'Petición sin token CSRF válido',
  acceso_denegado: 'Acceso denegado',
}

export const tipoEvento = (tipo: string): string => TIPOS_EVENTO[tipo] ?? tipo.replaceAll('_', ' ')
