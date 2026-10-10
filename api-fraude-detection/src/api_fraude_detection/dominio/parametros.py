"""Parámetros de detección: todas las entradas que gobiernan el análisis son configurables.

Se agrupan en perfiles (`PerfilDeteccion`) que un administrador guarda y que cada
análisis puede sobrescribir parcialmente.
"""

from datetime import date
from decimal import Decimal
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Moneda(StrEnum):
    VES = "VES"
    USD = "USD"


class Canal(StrEnum):
    PAGO_MOVIL = "pago_movil"
    TRANSFERENCIA = "transferencia"
    PUNTO_DE_VENTA = "punto_de_venta"
    BIOPAGO = "biopago"
    EFECTIVO = "efectivo"
    DIVISAS = "divisas"
    CRIPTOACTIVOS = "criptoactivos"
    OTRO = "otro"


class TipoOperacion(StrEnum):
    DEBITO = "debito"
    CREDITO = "credito"


class PruebaBenford(StrEnum):
    PRIMER_DIGITO = "primer_digito"
    SEGUNDO_DIGITO = "segundo_digito"
    PRIMEROS_DOS_DIGITOS = "primeros_dos_digitos"
    ULTIMOS_DOS_DIGITOS = "ultimos_dos_digitos"


class CriterioAgrupacion(StrEnum):
    CUENTA = "cuenta"
    CANAL = "canal"


class Conformidad(StrEnum):
    CERCANA = "cercana"
    ACEPTABLE = "aceptable"
    MARGINAL = "marginal"
    NO_CONFORMIDAD = "no_conformidad"
    NO_APLICA = "no_aplica"


class NivelRiesgo(StrEnum):
    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"
    CRITICO = "critico"


# Reconversiones monetarias venezolanas: dividir un monto en bolívares de la época
# entre el factor lo expresa en bolívares digitales (VES actual).
#   2008-01-01 Bolívar Fuerte   (÷ 1.000)
#   2018-08-20 Bolívar Soberano (÷ 100.000)
#   2021-10-01 Bolívar Digital  (÷ 1.000.000)
RECONVERSIONES_VES: tuple[tuple[date, Decimal], ...] = (
    (date(2008, 1, 1), Decimal(10) ** 14),
    (date(2018, 8, 20), Decimal(10) ** 11),
    (date(2021, 10, 1), Decimal(10) ** 6),
)


class _Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UmbralesMAD(_Modelo):
    """Cortes de la desviación absoluta media (MAD) que definen el nivel de conformidad."""

    cercana: float = Field(gt=0)
    aceptable: float = Field(gt=0)
    marginal: float = Field(gt=0)

    @model_validator(mode="after")
    def _ascendentes(self) -> Self:
        if not self.cercana < self.aceptable < self.marginal:
            raise ValueError("Los umbrales MAD deben cumplir cercana < aceptable < marginal")
        return self


# Valores de referencia de Mark Nigrini, "Benford's Law" (2012).
UMBRALES_MAD_NIGRINI: dict[PruebaBenford, UmbralesMAD] = {
    PruebaBenford.PRIMER_DIGITO: UmbralesMAD(cercana=0.006, aceptable=0.012, marginal=0.015),
    PruebaBenford.SEGUNDO_DIGITO: UmbralesMAD(cercana=0.008, aceptable=0.010, marginal=0.012),
    PruebaBenford.PRIMEROS_DOS_DIGITOS: UmbralesMAD(cercana=0.0012, aceptable=0.0018, marginal=0.0022),
}


class UmbralVigilado(_Modelo):
    """Monto de referencia cerca del cual se vigila el fraccionamiento ("pitufeo").

    Ejemplos: umbral de reporte de operaciones en efectivo exigido por SUDEBAN,
    límite diario de Pago Móvil del banco, tope de aprobación interna, etc.
    """

    nombre: str = Field(min_length=1, max_length=120)
    monto: Decimal = Field(gt=0)
    moneda: Moneda = Moneda.VES
    tolerancia_pct: float = Field(
        default=10, gt=0, le=50, description="Ancho de la banda bajo el umbral, en % del umbral"
    )


class PonderacionesRiesgo(_Modelo):
    """Puntos que aporta cada hallazgo al puntaje de riesgo (0-100)."""

    mad_aceptable: float = Field(default=10, ge=0)
    mad_marginal: float = Field(default=25, ge=0)
    mad_no_conformidad: float = Field(default=40, ge=0)
    chi_cuadrado_significativo: float = Field(default=15, ge=0)
    kolmogorov_smirnov_significativo: float = Field(default=5, ge=0)
    por_digito_atipico: float = Field(default=3, ge=0)
    max_digitos_atipicos: float = Field(default=15, ge=0)
    concentracion_bajo_umbral: float = Field(default=20, ge=0)
    exceso_montos_redondos: float = Field(default=10, ge=0)


class CortesNivelRiesgo(_Modelo):
    """Puntaje mínimo a partir del cual se asigna cada nivel de riesgo."""

    medio: float = Field(default=20, ge=0, le=100)
    alto: float = Field(default=45, ge=0, le=100)
    critico: float = Field(default=70, ge=0, le=100)

    @model_validator(mode="after")
    def _ascendentes(self) -> Self:
        if not self.medio < self.alto < self.critico:
            raise ValueError("Los cortes deben cumplir medio < alto < critico")
        return self


class ParametrosDeteccion(_Modelo):
    # --- Normalización monetaria ---
    moneda_base: Moneda = Field(
        default=Moneda.VES, description="Moneda a la que se convierten los montos antes del análisis"
    )
    tasa_bcv_predeterminada: Decimal | None = Field(
        default=None,
        gt=0,
        description="Bs por USD (tasa oficial BCV) usada cuando la transacción no trae su propia tasa",
    )
    aplicar_reconversion: bool = Field(
        default=True,
        description="Expresar montos en VES anteriores a 2008/2018/2021 en bolívares digitales",
    )

    # --- Filtros de la población ---
    monto_minimo: Decimal = Field(
        default=Decimal(10),
        ge=0,
        description="En moneda base. Montos muy pequeños distorsionan los dígitos (Nigrini sugiere ≥ 10)",
    )
    monto_maximo: Decimal | None = Field(default=None, gt=0)
    canales: list[Canal] | None = Field(default=None, description="None = todos los canales")
    tipos_operacion: list[TipoOperacion] | None = None

    # --- Pruebas de Benford ---
    pruebas: list[PruebaBenford] = Field(default_factory=lambda: list(PruebaBenford), min_length=1)
    tamano_muestra_minimo: int = Field(default=300, ge=30)
    umbrales_mad: dict[PruebaBenford, UmbralesMAD] = Field(default_factory=lambda: dict(UMBRALES_MAD_NIGRINI))
    z_critico: float = Field(default=1.96, gt=0, description="1,96 ≈ 5 %; 2,57 ≈ 1 %")
    alfa: float = Field(default=0.05, gt=0, lt=1, description="Significancia para chi² y K-S")
    corregir_comparaciones_multiples: bool = Field(
        default=True,
        description=(
            "Eleva z_critico con Bonferroni según el número de dígitos evaluados; sin esto, "
            "en las pruebas de 90-100 dígitos ~5 salen 'atípicos' por puro azar"
        ),
    )
    ajustar_mad_por_tamano: bool = Field(
        default=True,
        description=(
            "Clasifica la conformidad con MAD - MAD esperada por azar para el tamaño de muestra. "
            "False = cortes de Nigrini sobre la MAD bruta (adecuado solo con muestras muy grandes)"
        ),
    )

    # --- Segmentación ---
    agrupar_por: CriterioAgrupacion | None = Field(
        default=None, description="Analizar además cada cuenta o canal por separado"
    )
    max_grupos_reportados: int = Field(default=20, ge=1, le=500)

    # --- Fraccionamiento y redondeo ---
    umbrales_vigilados: list[UmbralVigilado] = Field(default_factory=list)
    factor_concentracion_umbral: float = Field(
        default=2.0,
        gt=1,
        description=(
            "Alerta si la razón (operaciones justo debajo / justo encima del umbral) supera "
            "N veces la razón esperada por Benford"
        ),
    )
    minimo_transacciones_banda: int = Field(default=5, ge=1)
    multiplo_redondo: int = Field(
        default=100, ge=10, description="Un monto 'redondo' es múltiplo de este valor (moneda original)"
    )
    factor_exceso_redondos: float = Field(
        default=3.0, gt=1, description="Alerta si los montos redondos superan N veces lo esperado"
    )
    canales_excluidos_redondeo: list[Canal] = Field(
        default_factory=lambda: [Canal.EFECTIVO, Canal.DIVISAS],
        description="Canales donde los montos redondos son normales (billetes en efectivo/divisas)",
    )

    # --- Puntaje ---
    ponderaciones: PonderacionesRiesgo = Field(default_factory=PonderacionesRiesgo)
    cortes_nivel_riesgo: CortesNivelRiesgo = Field(default_factory=CortesNivelRiesgo)

    @model_validator(mode="after")
    def _coherencia(self) -> Self:
        if self.monto_maximo is not None and self.monto_maximo <= self.monto_minimo:
            raise ValueError("monto_maximo debe ser mayor que monto_minimo")
        if len(set(self.pruebas)) != len(self.pruebas):
            raise ValueError("pruebas contiene elementos repetidos")
        return self

    def con_cambios(self, cambios: dict) -> ParametrosDeteccion:
        """Copia validada aplicando una sobrescritura parcial.

        Los objetos anidados (ponderaciones, umbrales_mad, ...) se combinan campo a campo;
        las listas se reemplazan completas.
        """
        return ParametrosDeteccion.model_validate(_combinar(self.model_dump(mode="json"), cambios))


def _combinar(base: dict, cambios: dict) -> dict:
    resultado = dict(base)
    for clave, valor in cambios.items():
        if isinstance(valor, dict) and isinstance(resultado.get(clave), dict):
            resultado[clave] = _combinar(resultado[clave], valor)
        else:
            resultado[clave] = valor
    return resultado
