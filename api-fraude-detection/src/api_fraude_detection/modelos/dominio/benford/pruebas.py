from collections.abc import Sequence
from decimal import Decimal

from ..parametros import Conformidad, ParametrosDeteccion, PruebaBenford, UmbralesMAD
from ..resultados import FrecuenciaDigito, ResultadoPrueba
from . import estadistica
from .distribuciones import contar_digitos, distribucion_esperada


def clasificar_conformidad(mad: float, umbrales: UmbralesMAD | None) -> Conformidad:
    if umbrales is None:
        return Conformidad.NO_APLICA
    if mad <= umbrales.cercana:
        return Conformidad.CERCANA
    if mad <= umbrales.aceptable:
        return Conformidad.ACEPTABLE
    if mad <= umbrales.marginal:
        return Conformidad.MARGINAL
    return Conformidad.NO_CONFORMIDAD


def ejecutar_prueba(
    prueba: PruebaBenford, montos: Sequence[Decimal], parametros: ParametrosDeteccion
) -> ResultadoPrueba:
    esperada = distribucion_esperada(prueba)
    conteo = contar_digitos(montos, prueba)
    n = sum(conteo.values())
    digitos = list(esperada)
    probabilidades = [esperada[d] for d in digitos]
    observados = [conteo[d] for d in digitos]
    proporciones = [o / n if n else 0.0 for o in observados]

    z_critico = parametros.z_critico
    if parametros.corregir_comparaciones_multiples:
        z_critico = max(z_critico, estadistica.z_bonferroni(parametros.alfa, len(digitos)))

    frecuencias: list[FrecuenciaDigito] = []
    for digito, obs, prop, esp in zip(digitos, observados, proporciones, probabilidades, strict=True):
        z = estadistica.estadistico_z(prop, esp, n) if n else 0.0
        frecuencias.append(
            FrecuenciaDigito(
                digito=digito,
                observados=obs,
                proporcion=prop,
                esperada=esp,
                z=round(z, 4),
                atipico=z > z_critico,
            )
        )

    mad = estadistica.desviacion_absoluta_media(proporciones, probabilidades)
    mad_azar = estadistica.mad_esperada_por_azar(probabilidades, n)
    mad_ajustada = max(0.0, mad - mad_azar)
    mad_clasificada = mad_ajustada if parametros.ajustar_mad_por_tamano else mad
    chi2 = estadistica.chi_cuadrado(observados, [p * n for p in probabilidades])
    grados = len(digitos) - 1
    valor_p = estadistica.chi_cuadrado_valor_p(chi2, grados)
    ks = estadistica.kolmogorov_smirnov(proporciones, probabilidades)
    ks_critico = estadistica.ks_valor_critico(n, parametros.alfa) if n else 0.0

    resultado = ResultadoPrueba(
        prueba=prueba,
        n=n,
        muestra_suficiente=n >= parametros.tamano_muestra_minimo,
        mad=round(mad, 6),
        mad_esperada_por_azar=round(mad_azar, 6),
        mad_ajustada=round(mad_ajustada, 6),
        conformidad=(
            clasificar_conformidad(mad_clasificada, parametros.umbrales_mad.get(prueba))
            if n
            else Conformidad.NO_APLICA
        ),
        chi_cuadrado=round(chi2, 4),
        grados_libertad=grados,
        valor_p=valor_p,
        chi_cuadrado_significativo=n > 0 and valor_p < parametros.alfa,
        kolmogorov_smirnov=round(ks, 6),
        ks_valor_critico=round(ks_critico, 6),
        ks_significativo=n > 0 and ks > ks_critico,
        z_critico_aplicado=round(z_critico, 4),
        digitos_atipicos=[f.digito for f in frecuencias if f.atipico],
        frecuencias=frecuencias,
        puntos=0.0,
    )
    resultado.puntos = puntuar_prueba(resultado, parametros)
    return resultado


def puntuar_prueba(resultado: ResultadoPrueba, parametros: ParametrosDeteccion) -> float:
    # Con muestras pequeñas las desviaciones son ruido: se reportan pero no puntúan.
    if not resultado.muestra_suficiente:
        return 0.0
    pond = parametros.ponderaciones
    puntos = {
        Conformidad.ACEPTABLE: pond.mad_aceptable,
        Conformidad.MARGINAL: pond.mad_marginal,
        Conformidad.NO_CONFORMIDAD: pond.mad_no_conformidad,
    }.get(resultado.conformidad, 0.0)
    if resultado.chi_cuadrado_significativo:
        puntos += pond.chi_cuadrado_significativo
    if resultado.ks_significativo:
        puntos += pond.kolmogorov_smirnov_significativo
    puntos += min(len(resultado.digitos_atipicos) * pond.por_digito_atipico, pond.max_digitos_atipicos)
    return puntos
