"""Estadísticos de bondad de ajuste usados en auditoría forense (Nigrini, 2012).

Implementados sin SciPy para mantener la API liviana.
"""

import math
from statistics import NormalDist


def _gamma_inferior_regularizada_serie(a: float, x: float) -> float:
    termino = suma = 1.0 / a
    n = a
    for _ in range(1000):
        n += 1
        termino *= x / n
        suma += termino
        if abs(termino) < abs(suma) * 1e-15:
            break
    return suma * math.exp(-x + a * math.log(x) - math.lgamma(a))


def _gamma_superior_regularizada_fraccion(a: float, x: float) -> float:
    # Fracción continua de Lentz (Numerical Recipes, gcf).
    minimo = 1e-300
    b = x + 1 - a
    c = 1 / minimo
    d = 1 / b
    h = d
    for i in range(1, 1000):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = minimo if abs(d) < minimo else d
        c = b + an / c
        c = minimo if abs(c) < minimo else c
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-15:
            break
    return h * math.exp(-x + a * math.log(x) - math.lgamma(a))


def chi_cuadrado_valor_p(estadistico: float, grados_libertad: int) -> float:
    """P(X > estadistico) para X ~ chi²(grados_libertad)."""
    if estadistico <= 0:
        return 1.0
    a, x = grados_libertad / 2, estadistico / 2
    if x < a + 1:
        return max(0.0, 1 - _gamma_inferior_regularizada_serie(a, x))
    return min(1.0, _gamma_superior_regularizada_fraccion(a, x))


def chi_cuadrado(observados: list[int], esperados: list[float]) -> float:
    return sum((o - e) ** 2 / e for o, e in zip(observados, esperados, strict=True) if e > 0)


def desviacion_absoluta_media(proporciones: list[float], esperadas: list[float]) -> float:
    """MAD de Nigrini: promedio de |proporción real - proporción esperada|."""
    return sum(abs(p - e) for p, e in zip(proporciones, esperadas, strict=True)) / len(esperadas)


def mad_esperada_por_azar(esperadas: list[float], n: int) -> float:
    """MAD que se espera aun cuando los datos SÍ siguen Benford, solo por ruido de muestreo.

    Cada proporción observada ~ Normal(p, p(1-p)/n) y E|X - p| = σ·√(2/π). Los cortes de
    Nigrini suponen muestras grandes; con n pequeño esta MAD "de azar" puede superarlos
    (p. ej., primeros dos dígitos con n = 1.000 da ≈ 0,0024 > 0,0022).
    """
    if n <= 0:
        return 0.0
    factor = math.sqrt(2 / (math.pi * n))
    return sum(factor * math.sqrt(e * (1 - e)) for e in esperadas) / len(esperadas)


def z_bonferroni(alfa: float, comparaciones: int) -> float:
    """Z crítico bilateral que mantiene el error global α al evaluar muchos dígitos a la vez."""
    return NormalDist().inv_cdf(1 - alfa / (2 * comparaciones))


def estadistico_z(proporcion: float, esperada: float, n: int) -> float:
    """Z de Nigrini con corrección de continuidad 1/(2n) (solo si es menor que la diferencia)."""
    diferencia = abs(proporcion - esperada)
    correccion = 1 / (2 * n)
    if correccion < diferencia:
        diferencia -= correccion
    return diferencia / math.sqrt(esperada * (1 - esperada) / n)


def kolmogorov_smirnov(proporciones: list[float], esperadas: list[float]) -> float:
    """Máxima diferencia entre las distribuciones acumuladas real y esperada."""
    acumulada_real = acumulada_esperada = maximo = 0.0
    for p, e in zip(proporciones, esperadas, strict=True):
        acumulada_real += p
        acumulada_esperada += e
        maximo = max(maximo, abs(acumulada_real - acumulada_esperada))
    return maximo


def ks_valor_critico(n: int, alfa: float) -> float:
    """Valor crítico asintótico de K-S: c(α)/√n con c(α) = √(-ln(α/2)/2)."""
    return math.sqrt(-math.log(alfa / 2) / 2) / math.sqrt(n)
