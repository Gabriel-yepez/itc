from decimal import Decimal

from pydantic import BaseModel

from .parametros import Conformidad, Moneda, NivelRiesgo, PruebaBenford


class FrecuenciaDigito(BaseModel):
    digito: int
    observados: int
    proporcion: float
    esperada: float
    z: float
    atipico: bool


class ResultadoPrueba(BaseModel):
    prueba: PruebaBenford
    n: int
    muestra_suficiente: bool
    mad: float
    mad_esperada_por_azar: float
    mad_ajustada: float
    conformidad: Conformidad
    chi_cuadrado: float
    grados_libertad: int
    valor_p: float
    chi_cuadrado_significativo: bool
    kolmogorov_smirnov: float
    ks_valor_critico: float
    ks_significativo: bool
    z_critico_aplicado: float
    digitos_atipicos: list[int]
    frecuencias: list[FrecuenciaDigito]
    puntos: float


class ResultadoUmbral(BaseModel):
    nombre: str
    monto: Decimal
    moneda: Moneda
    banda_inferior_desde: Decimal
    banda_superior_hasta: Decimal
    en_banda_inferior: int
    en_banda_superior: int
    razon_observada: float | None
    razon_esperada: float
    alerta: bool
    puntos: float


class ResultadoRedondeo(BaseModel):
    multiplo: int
    evaluados: int
    redondos: int
    proporcion: float
    esperada: float
    alerta: bool
    puntos: float


class ResultadoGrupo(BaseModel):
    clave: str
    total_analizadas: int
    puntaje: float
    nivel_riesgo: NivelRiesgo
    conformidad_primer_digito: Conformidad | None
    hallazgos: list[str]


class ResultadoAnalisis(BaseModel):
    moneda_base: Moneda
    total_recibidas: int
    total_analizadas: int
    excluidas: dict[str, int]
    monto_minimo_observado: Decimal | None
    monto_maximo_observado: Decimal | None
    ordenes_de_magnitud: float | None
    pruebas: list[ResultadoPrueba]
    umbrales: list[ResultadoUmbral]
    redondeo: ResultadoRedondeo | None
    grupos: list[ResultadoGrupo]
    grupos_omitidos_por_tamano: int
    puntaje: float
    nivel_riesgo: NivelRiesgo
    hallazgos: list[str]
    advertencias: list[str]
