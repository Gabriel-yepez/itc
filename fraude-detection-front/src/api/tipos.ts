/**
 * Tipos del contrato con la API (espejo de los esquemas OpenAPI del backend, GET /openapi.json).
 *
 * Los montos llegan como `Decimal` (string) para no perder precisión con números de coma flotante;
 * al enviarlos se recomienda también usar string ("1520.75").
 */

export type Decimal = string
/** Fecha y hora ISO 8601 en UTC. */
export type FechaHora = string
/** Fecha ISO 8601 (AAAA-MM-DD). */
export type Fecha = string

/** Hace opcionales todos los campos, también los de objetos anidados (para sobrescrituras parciales). */
export type ParcialProfundo<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? ParcialProfundo<T[K]> : T[K]
}

// ------------------------------------------------------------------ enumeraciones

export type Rol = 'admin' | 'analista'
export type Moneda = 'VES' | 'USD'
export type Canal =
  | 'pago_movil'
  | 'transferencia'
  | 'punto_de_venta'
  | 'biopago'
  | 'efectivo'
  | 'divisas'
  | 'criptoactivos'
  | 'otro'
export type TipoOperacion = 'debito' | 'credito'
export type PruebaBenford = 'primer_digito' | 'segundo_digito' | 'primeros_dos_digitos' | 'ultimos_dos_digitos'
export type CriterioAgrupacion = 'cuenta' | 'canal'
export type Conformidad = 'cercana' | 'aceptable' | 'marginal' | 'no_conformidad' | 'no_aplica'
export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico'

// ------------------------------------------------------------------ autenticación y usuarios

export interface Credenciales {
  usuario: string
  contrasena: string
}

export interface UsuarioPublico {
  id: number
  nombre_usuario: string
  rol: Rol
  activo: boolean
  /** Contraseña asignada por otra persona: hasta cambiarla, la API solo permite cambiarla o salir. */
  debe_cambiar_contrasena: boolean
  segundo_factor_activo: boolean
  /** Administrador sin doble factor: hasta configurarlo, la API solo permite hacerlo o salir. */
  debe_configurar_segundo_factor: boolean
  creado_en: FechaHora
}

/** Respuesta del login: la sesión, o el aviso de que falta el código de doble factor. */
export interface RespuestaInicio {
  segundo_factor_requerido: boolean
  usuario: UsuarioPublico | null
  expira_en: FechaHora | null
  csrf_token?: string | null
}

export interface ConfiguracionSegundoFactor {
  /** Para escribirlo a mano en la app si no se puede leer el QR. */
  secreto: string
  uri: string
  /** Imagen SVG del QR como data URI (la CSP permite img-src data:). */
  qr: string
}

export interface CodigosRecuperacion {
  codigos_recuperacion: string[]
}

export type Severidad = 'info' | 'advertencia' | 'critica'

export interface EventoAuditoria {
  id: number
  momento: FechaHora
  tipo: string
  severidad: Severidad
  nombre_usuario: string | null
  ip: string | null
  detalle: Record<string, unknown>
}

export interface RespuestaSesion {
  usuario: UsuarioPublico
  expira_en: FechaHora
  /** Solo viene en el login; axios lo toma de la cookie `csrf_token` automáticamente. */
  csrf_token?: string | null
}

export interface CambioContrasena {
  contrasena_actual: string
  /** Mínimo 12 caracteres. */
  contrasena_nueva: string
}

export interface NuevoUsuario {
  nombre_usuario: string
  contrasena: string
  rol?: Rol
}

export interface CambiosUsuario {
  rol?: Rol
  activo?: boolean
}

// ------------------------------------------------------------------ parámetros de detección

export interface UmbralesMAD {
  cercana: number
  aceptable: number
  marginal: number
}

export interface UmbralVigilado {
  nombre: string
  monto: Decimal
  moneda: Moneda
  tolerancia_pct: number
}

export interface PonderacionesRiesgo {
  mad_aceptable: number
  mad_marginal: number
  mad_no_conformidad: number
  chi_cuadrado_significativo: number
  kolmogorov_smirnov_significativo: number
  por_digito_atipico: number
  max_digitos_atipicos: number
  concentracion_bajo_umbral: number
  exceso_montos_redondos: number
}

export interface CortesNivelRiesgo {
  medio: number
  alto: number
  critico: number
}

export interface ParametrosDeteccion {
  moneda_base: Moneda
  tasa_bcv_predeterminada: Decimal | null
  aplicar_reconversion: boolean
  monto_minimo: Decimal
  monto_maximo: Decimal | null
  canales: Canal[] | null
  tipos_operacion: TipoOperacion[] | null
  pruebas: PruebaBenford[]
  tamano_muestra_minimo: number
  umbrales_mad: Partial<Record<PruebaBenford, UmbralesMAD>>
  z_critico: number
  alfa: number
  corregir_comparaciones_multiples: boolean
  ajustar_mad_por_tamano: boolean
  agrupar_por: CriterioAgrupacion | null
  max_grupos_reportados: number
  umbrales_vigilados: UmbralVigilado[]
  factor_concentracion_umbral: number
  minimo_transacciones_banda: number
  multiplo_redondo: number
  factor_exceso_redondos: number
  canales_excluidos_redondeo: Canal[]
  ponderaciones: PonderacionesRiesgo
  cortes_nivel_riesgo: CortesNivelRiesgo
}

/** Cambios parciales sobre los parámetros de un perfil (los objetos anidados se combinan). */
export type SobrescriturasParametros = ParcialProfundo<ParametrosDeteccion>

// ------------------------------------------------------------------ perfiles

export interface PerfilDeteccion {
  id: number
  nombre: string
  descripcion: string
  predeterminado: boolean
  parametros: ParametrosDeteccion
  creado_en: FechaHora
  actualizado_en: FechaHora
}

export interface NuevoPerfil {
  nombre: string
  descripcion?: string
  predeterminado?: boolean
  parametros?: SobrescriturasParametros
}

export interface CambiosPerfil {
  nombre?: string
  descripcion?: string
  predeterminado?: boolean
  parametros?: SobrescriturasParametros
}

// ------------------------------------------------------------------ análisis

export interface Transaccion {
  id?: string | null
  /** Mayor que 0. Preferible como string para no perder decimales. */
  monto: Decimal | number
  moneda?: Moneda
  fecha?: Fecha | null
  canal?: Canal
  tipo?: TipoOperacion | null
  /** Identificador de cuenta; se recomienda anonimizado (hash). */
  cuenta?: string | null
  /** Bs por USD vigente en la fecha de la operación. */
  tasa_bcv?: Decimal | number | null
}

export interface SolicitudAnalisis {
  transacciones: Transaccion[]
  /** Si se omite se usa el perfil predeterminado. */
  perfil_id?: number | null
  parametros?: SobrescriturasParametros | null
  descripcion?: string
  guardar?: boolean
}

export interface FormatoCsv {
  delimitador?: ';' | ',' | '\t' | '|'
  separador_decimal?: ',' | '.'
  formato_fecha?: string
  codificacion?: 'utf-8' | 'utf-8-sig' | 'latin-1'
  omitir_filas_invalidas?: boolean
  /** Campo de la transacción -> nombre de la columna en el archivo. */
  columnas?: Partial<Record<keyof Transaccion, string>>
}

export interface OpcionesAnalisisCsv {
  perfilId?: number
  parametros?: SobrescriturasParametros
  formato?: FormatoCsv
  descripcion?: string
  guardar?: boolean
}

export interface FrecuenciaDigito {
  digito: number
  observados: number
  proporcion: number
  esperada: number
  z: number
  atipico: boolean
}

export interface ResultadoPrueba {
  prueba: PruebaBenford
  n: number
  muestra_suficiente: boolean
  mad: number
  mad_esperada_por_azar: number
  mad_ajustada: number
  conformidad: Conformidad
  chi_cuadrado: number
  grados_libertad: number
  valor_p: number
  chi_cuadrado_significativo: boolean
  kolmogorov_smirnov: number
  ks_valor_critico: number
  ks_significativo: boolean
  z_critico_aplicado: number
  digitos_atipicos: number[]
  frecuencias: FrecuenciaDigito[]
  puntos: number
}

export interface ResultadoUmbral {
  nombre: string
  monto: Decimal
  moneda: Moneda
  banda_inferior_desde: Decimal
  banda_superior_hasta: Decimal
  en_banda_inferior: number
  en_banda_superior: number
  razon_observada: number | null
  razon_esperada: number
  alerta: boolean
  puntos: number
}

export interface ResultadoRedondeo {
  multiplo: number
  evaluados: number
  redondos: number
  proporcion: number
  esperada: number
  alerta: boolean
  puntos: number
}

export interface ResultadoGrupo {
  clave: string
  total_analizadas: number
  puntaje: number
  nivel_riesgo: NivelRiesgo
  conformidad_primer_digito: Conformidad | null
  hallazgos: string[]
}

export interface ResultadoAnalisis {
  moneda_base: Moneda
  total_recibidas: number
  total_analizadas: number
  excluidas: Record<string, number>
  monto_minimo_observado: Decimal | null
  monto_maximo_observado: Decimal | null
  ordenes_de_magnitud: number | null
  pruebas: ResultadoPrueba[]
  umbrales: ResultadoUmbral[]
  redondeo: ResultadoRedondeo | null
  grupos: ResultadoGrupo[]
  grupos_omitidos_por_tamano: number
  puntaje: number
  nivel_riesgo: NivelRiesgo
  hallazgos: string[]
  advertencias: string[]
}

export interface Analisis {
  /** null cuando se pidió `guardar: false`. */
  id: number | null
  perfil_id: number | null
  descripcion: string
  creado_en: FechaHora
  parametros: ParametrosDeteccion
  resultado: ResultadoAnalisis
}

export interface ResumenAnalisis {
  id: number
  usuario_id: number
  perfil_id: number | null
  descripcion: string
  puntaje: number
  nivel_riesgo: NivelRiesgo
  total_transacciones: number
  creado_en: FechaHora
}

export interface Paginacion {
  limite?: number
  desplazamiento?: number
}
