"""Genera dos extractos CSV de ejemplo (formato venezolano) para probar la detección.

    uv run python ejemplos/generar_csv.py

- transacciones_normales.csv: montos "naturales" (siguen la Ley de Benford) -> riesgo bajo.
- transacciones_con_fraude.csv: la misma base + tres patrones de fraude -> riesgo alto/crítico:
    1. Montos inventados en Pago Móvil (cuentas cta-09xx): cifras entre 4.000 y 9.900 Bs.
    2. Fraccionamiento: transferencias justo por debajo del umbral de 10.000 US$ (cuenta cta-0777).
    3. Montos redondos fabricados en transferencias (múltiplos de 1.000 Bs).

Los datos son sintéticos: no corresponden a personas ni cuentas reales.
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

DIRECTORIO = Path(__file__).parent
CABECERA = ["fecha", "monto", "moneda", "canal", "tipo", "cuenta", "tasa_bcv"]


def bolivares(valor: float) -> str:
    """1234567.891 -> '1.234.567,89'"""
    return f"{valor:,.2f}".replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def log_uniforme(rng: random.Random, desde_exp: float, hasta_exp: float) -> float:
    """Montos repartidos uniformemente en escala logarítmica: así se comportan los datos reales."""
    return 10 ** rng.uniform(desde_exp, hasta_exp)


def tasa_del_dia(dia: date) -> float:
    """Tasa BCV ficticia de marzo 2024 (Bs por US$), con una leve tendencia al alza."""
    return 36.10 + (dia.day - 1) * 0.012


def fila(rng: random.Random, dia: date, monto: float, moneda: str, canal: str, cuenta: str) -> list[str]:
    tipo = rng.choice(["Débito", "Débito", "Crédito"])
    return [
        dia.strftime("%d/%m/%Y"),
        bolivares(monto),
        moneda,
        canal,
        tipo,
        cuenta,
        bolivares(tasa_del_dia(dia)),
    ]


def operaciones_normales(rng: random.Random) -> list[list[str]]:
    inicio = date(2024, 3, 1)
    cuentas = [f"cta-{n:04d}" for n in range(1, 121)]
    filas = []
    # (canal, moneda, cantidad, rango en potencias de 10)
    perfiles = [
        ("Pago Móvil", "VES", 900, (1, 4)),  # 10 Bs a 10.000 Bs
        ("Punto de venta", "VES", 550, (1, 4)),
        ("Transferencia", "VES", 650, (2, 6)),  # 100 Bs a 1.000.000 Bs
        ("Divisas", "USD", 320, (0.7, 3.7)),  # 5 US$ a 5.000 US$
    ]
    for canal, moneda, cantidad, (desde, hasta) in perfiles:
        for _ in range(cantidad):
            dia = inicio + timedelta(days=rng.randrange(31))
            filas.append(fila(rng, dia, log_uniforme(rng, desde, hasta), moneda, canal, rng.choice(cuentas)))
    return filas


def operaciones_fraudulentas(rng: random.Random) -> list[list[str]]:
    inicio = date(2024, 3, 1)
    filas = []

    # 1. Montos inventados: quien fabrica cifras evita el 1 y el 2 y prefiere "montos medianos".
    for _ in range(450):
        dia = inicio + timedelta(days=rng.randrange(31))
        cuenta = f"cta-09{rng.randrange(10, 16)}"
        filas.append(fila(rng, dia, rng.uniform(4_000, 9_900), "VES", "Pago Móvil", cuenta))

    # 2. Fraccionamiento: depósitos de 9.000 a 9.950 US$ en Bs para no llegar al umbral de 10.000 US$.
    for _ in range(70):
        dia = inicio + timedelta(days=rng.randrange(31))
        usd = rng.uniform(9_000, 9_950)
        filas.append(fila(rng, dia, usd * tasa_del_dia(dia), "VES", "Transferencia", "cta-0777"))

    # 3. Montos redondos fabricados (25.000, 50.000, 150.000 Bs...).
    for _ in range(90):
        dia = inicio + timedelta(days=rng.randrange(31))
        redondo = rng.choice([5, 10, 20, 25, 50, 100, 150, 200]) * 1_000
        filas.append(fila(rng, dia, redondo, "VES", "Transferencia", f"cta-08{rng.randrange(10, 20)}"))

    return filas


def escribir(nombre: str, filas: list[list[str]], rng: random.Random) -> Path:
    rng.shuffle(filas)
    filas.sort(key=lambda f: tuple(reversed(f[0].split("/"))))  # orden cronológico, como un extracto
    ruta = DIRECTORIO / nombre
    with ruta.open("w", newline="", encoding="utf-8") as archivo:
        escritor = csv.writer(archivo, delimiter=";")
        escritor.writerow(CABECERA)
        escritor.writerows(filas)
    return ruta


def main() -> None:
    normales = escribir(
        "transacciones_normales.csv", operaciones_normales(random.Random(2024)), random.Random(1)
    )
    base = operaciones_normales(random.Random(2025))
    fraude = escribir(
        "transacciones_con_fraude.csv", base + operaciones_fraudulentas(random.Random(77)), random.Random(2)
    )
    for ruta in (normales, fraude):
        print(f"{ruta.name}: {sum(1 for _ in ruta.open(encoding='utf-8')) - 1} operaciones")


if __name__ == "__main__":
    main()
