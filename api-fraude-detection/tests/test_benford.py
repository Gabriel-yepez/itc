import math
from datetime import date
from decimal import Decimal

import pytest

from api_fraude_detection.dominio.benford.distribuciones import distribucion_esperada, extraer_digito
from api_fraude_detection.dominio.benford.estadistica import chi_cuadrado_valor_p
from api_fraude_detection.dominio.detector import DetectorBenford, factor_reconversion
from api_fraude_detection.dominio.parametros import (
    Canal,
    Conformidad,
    CriterioAgrupacion,
    Moneda,
    NivelRiesgo,
    ParametrosDeteccion,
    PruebaBenford,
    UmbralVigilado,
)
from api_fraude_detection.dominio.transacciones import Transaccion

from .conftest import montos_benford, montos_inventados


def _txs(montos, **campos) -> list[Transaccion]:
    return [Transaccion(monto=m, **campos) for m in montos]


@pytest.mark.parametrize("prueba", list(PruebaBenford))
def test_distribuciones_suman_uno(prueba):
    assert math.isclose(sum(distribucion_esperada(prueba).values()), 1.0, rel_tol=1e-9)


def test_primer_digito_benford_clasico():
    esperada = distribucion_esperada(PruebaBenford.PRIMER_DIGITO)
    assert esperada[1] == pytest.approx(0.30103, abs=1e-5)
    assert esperada[9] == pytest.approx(0.04576, abs=1e-5)


@pytest.mark.parametrize(
    ("monto", "prueba", "esperado"),
    [
        ("1234.56", PruebaBenford.PRIMER_DIGITO, 1),
        ("0.0352", PruebaBenford.PRIMER_DIGITO, 3),
        ("1234.56", PruebaBenford.SEGUNDO_DIGITO, 2),
        ("500", PruebaBenford.SEGUNDO_DIGITO, 0),
        ("7", PruebaBenford.PRIMEROS_DOS_DIGITOS, 70),
        ("98765", PruebaBenford.PRIMEROS_DOS_DIGITOS, 98),
        ("12345.99", PruebaBenford.ULTIMOS_DOS_DIGITOS, 45),
        ("45", PruebaBenford.ULTIMOS_DOS_DIGITOS, None),
    ],
)
def test_extraer_digito(monto, prueba, esperado):
    assert extraer_digito(Decimal(monto), prueba) == esperado


def test_valor_p_chi_cuadrado():
    # Valores de tabla: chi²(8) = 15,507 -> p = 0,05 ; chi²(89) = 112,022 -> p = 0,05
    assert chi_cuadrado_valor_p(15.507, 8) == pytest.approx(0.05, abs=1e-3)
    assert chi_cuadrado_valor_p(112.022, 89) == pytest.approx(0.05, abs=1e-3)
    assert chi_cuadrado_valor_p(0, 8) == 1.0


def test_datos_naturales_conforman():
    resultado = DetectorBenford().analizar(_txs(montos_benford(5000)), ParametrosDeteccion())
    primer = next(p for p in resultado.pruebas if p.prueba is PruebaBenford.PRIMER_DIGITO)
    assert primer.conformidad in (Conformidad.CERCANA, Conformidad.ACEPTABLE)
    assert resultado.nivel_riesgo is NivelRiesgo.BAJO
    assert resultado.total_analizadas == 5000


def test_datos_inventados_no_conforman():
    resultado = DetectorBenford().analizar(_txs(montos_inventados(2000)), ParametrosDeteccion())
    primer = next(p for p in resultado.pruebas if p.prueba is PruebaBenford.PRIMER_DIGITO)
    assert primer.conformidad is Conformidad.NO_CONFORMIDAD
    assert resultado.nivel_riesgo in (NivelRiesgo.ALTO, NivelRiesgo.CRITICO)
    assert any("órdenes de magnitud" in a for a in resultado.advertencias)


def test_muestra_pequena_no_puntua():
    resultado = DetectorBenford().analizar(_txs(montos_inventados(50)), ParametrosDeteccion())
    assert all(p.puntos == 0 for p in resultado.pruebas)
    assert any("Solo 50" in a for a in resultado.advertencias)


def test_parametro_tamano_muestra_cambia_el_resultado():
    txs = _txs(montos_inventados(200))
    sin_puntos = DetectorBenford().analizar(txs, ParametrosDeteccion(tamano_muestra_minimo=300))
    con_puntos = DetectorBenford().analizar(txs, ParametrosDeteccion(tamano_muestra_minimo=100))
    assert con_puntos.puntaje > sin_puntos.puntaje


def test_reconversion_monetaria_venezolana():
    assert factor_reconversion(date(2005, 6, 1)) == Decimal(10) ** 14
    assert factor_reconversion(date(2015, 6, 1)) == Decimal(10) ** 11
    assert factor_reconversion(date(2020, 6, 1)) == Decimal(10) ** 6
    assert factor_reconversion(date(2022, 6, 1)) == 1

    # 5.000.000 BsS de 2020 = 5 Bs digitales: queda por debajo del monto mínimo (10).
    resultado = DetectorBenford().analizar(
        [Transaccion(monto=Decimal(5_000_000), fecha=date(2020, 6, 1))], ParametrosDeteccion()
    )
    assert resultado.excluidas == {"bajo_monto_minimo": 1}


def test_conversion_a_dolares_requiere_tasa():
    parametros = ParametrosDeteccion(moneda_base=Moneda.USD, monto_minimo=Decimal(1))
    txs = [
        Transaccion(monto=Decimal(3650), tasa_bcv=Decimal("36.5")),  # 100 USD
        Transaccion(monto=Decimal(3650)),  # sin tasa -> excluida
        Transaccion(monto=Decimal(20), moneda=Moneda.USD),
    ]
    resultado = DetectorBenford().analizar(txs, parametros)
    assert resultado.excluidas == {"sin_tasa_de_cambio": 1}
    assert resultado.monto_maximo_observado == Decimal(100)


def test_filtro_por_canal():
    txs = _txs(montos_benford(100), canal=Canal.PAGO_MOVIL) + _txs(montos_benford(50), canal=Canal.EFECTIVO)
    resultado = DetectorBenford().analizar(txs, ParametrosDeteccion(canales=[Canal.PAGO_MOVIL]))
    assert resultado.excluidas["canal_no_seleccionado"] == 50


def test_fraccionamiento_bajo_umbral():
    umbral = UmbralVigilado(nombre="Reporte", monto=Decimal(10_000), moneda=Moneda.VES, tolerancia_pct=10)
    normales = _txs(montos_benford(1000))
    pitufeo = _txs([Decimal("9850.00") - i for i in range(40)])
    parametros = ParametrosDeteccion(umbrales_vigilados=[umbral])

    limpio = DetectorBenford().analizar(normales, parametros)
    sospechoso = DetectorBenford().analizar(normales + pitufeo, parametros)
    assert not limpio.umbrales[0].alerta
    assert sospechoso.umbrales[0].alerta
    assert any("fraccionamiento" in h for h in sospechoso.hallazgos)


def test_exceso_de_montos_redondos_y_canales_excluidos():
    redondos = [Decimal(500 * (i % 20 + 1)) for i in range(200)]
    resultado = DetectorBenford().analizar(_txs(montos_benford(800) + redondos), ParametrosDeteccion())
    assert resultado.redondeo.alerta

    # En efectivo/divisas los montos redondos son normales y no se evalúan.
    resultado = DetectorBenford().analizar(
        _txs(montos_benford(800)) + _txs(redondos, canal=Canal.DIVISAS), ParametrosDeteccion()
    )
    assert not resultado.redondeo.alerta


def test_agrupacion_por_cuenta_senala_la_cuenta_anomala():
    txs = _txs(montos_benford(1000), cuenta="cuenta-normal") + _txs(
        montos_inventados(1000), cuenta="cuenta-sospechosa"
    )
    resultado = DetectorBenford().analizar(txs, ParametrosDeteccion(agrupar_por=CriterioAgrupacion.CUENTA))
    assert resultado.grupos[0].clave == "cuenta-sospechosa"
    assert resultado.grupos[0].nivel_riesgo in (NivelRiesgo.ALTO, NivelRiesgo.CRITICO)
    assert resultado.grupos[1].nivel_riesgo is NivelRiesgo.BAJO


def test_sobrescritura_parcial_de_parametros():
    base = ParametrosDeteccion()
    nuevo = base.con_cambios({"ponderaciones": {"mad_no_conformidad": 60}, "z_critico": 2.57})
    assert nuevo.ponderaciones.mad_no_conformidad == 60
    assert nuevo.ponderaciones.mad_marginal == base.ponderaciones.mad_marginal
    assert nuevo.z_critico == 2.57
    with pytest.raises(ValueError):
        base.con_cambios({"umbrales_mad": {"primer_digito": {"cercana": 0.02}}})
