"""Distribuciones esperadas según la Ley de Benford y extracción de dígitos.

La Ley de Benford establece que, en muchos conjuntos de datos financieros "naturales",
el primer dígito significativo d aparece con probabilidad P(d) = log10(1 + 1/d):
el 1 aparece ~30,1 % de las veces y el 9 solo ~4,6 %. Los montos inventados o
manipulados por personas suelen desviarse de ese patrón.
"""

import math
from collections.abc import Iterable
from decimal import Decimal
from functools import cache

from ..parametros import PruebaBenford


@cache
def distribucion_esperada(prueba: PruebaBenford) -> dict[int, float]:
    match prueba:
        case PruebaBenford.PRIMER_DIGITO:
            return {d: math.log10(1 + 1 / d) for d in range(1, 10)}
        case PruebaBenford.SEGUNDO_DIGITO:
            return {d: sum(math.log10(1 + 1 / (10 * k + d)) for k in range(1, 10)) for d in range(10)}
        case PruebaBenford.PRIMEROS_DOS_DIGITOS:
            return {d: math.log10(1 + 1 / d) for d in range(10, 100)}
        case PruebaBenford.ULTIMOS_DOS_DIGITOS:
            # Los dos últimos dígitos de la parte entera deberían ser uniformes.
            return {d: 1 / 100 for d in range(100)}


def digitos_significativos(monto: Decimal) -> tuple[int, ...]:
    """Dígitos significativos de |monto| sin ceros a la izquierda (0,0352 -> (3, 5, 2)).

    El coeficiente de un Decimal nunca lleva ceros a la izquierda; los ceros finales que pueda
    tener no alteran el primer ni el segundo dígito. Sin normalize(), que desborda el contexto
    con exponentes extremos.
    """
    digitos = monto.as_tuple().digits
    return tuple(digitos) if digitos and digitos[0] != 0 else ()


def _ultimos_dos_enteros(monto: Decimal) -> int | None:
    """Últimas dos cifras de la parte entera, leídas de la representación (dígitos, exponente).

    No usa int(monto): construir el entero cuesta tiempo proporcional al exponente (1e999999
    son un millón de cifras), mientras que esto es O(cifras significativas).
    """
    _, digitos, exponente = monto.copy_abs().as_tuple()
    cifras_enteras = len(digitos) + exponente
    # Con menos de 3 cifras enteras los "últimos dos" se solapan con los primeros.
    if digitos == (0,) or cifras_enteras < 3:
        return None
    if exponente >= 2:  # ...00
        return 0
    if exponente == 1:  # ...d0
        return digitos[-1] * 10
    return digitos[cifras_enteras - 2] * 10 + digitos[cifras_enteras - 1]


def extraer_digito(monto: Decimal, prueba: PruebaBenford) -> int | None:
    """Valor que la prueba analiza para `monto`, o None si el monto no aplica."""
    if not monto.is_finite():
        return None
    if prueba is PruebaBenford.ULTIMOS_DOS_DIGITOS:
        return _ultimos_dos_enteros(monto)

    digitos = digitos_significativos(monto)
    if not digitos:
        return None
    segundo = digitos[1] if len(digitos) > 1 else 0
    match prueba:
        case PruebaBenford.PRIMER_DIGITO:
            return digitos[0]
        case PruebaBenford.SEGUNDO_DIGITO:
            return segundo
        case PruebaBenford.PRIMEROS_DOS_DIGITOS:
            return digitos[0] * 10 + segundo


def contar_digitos(montos: Iterable[Decimal], prueba: PruebaBenford) -> dict[int, int]:
    conteo = dict.fromkeys(distribucion_esperada(prueba), 0)
    for monto in montos:
        digito = extraer_digito(monto, prueba)
        if digito is not None:
            conteo[digito] += 1
    return conteo
