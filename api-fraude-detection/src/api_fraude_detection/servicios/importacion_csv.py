"""Lectura de extractos bancarios en CSV con formato configurable.

Los sistemas venezolanos suelen exportar montos como "1.234.567,89" con `;` como
separador de columnas y fechas dd/mm/aaaa; todo eso es parametrizable.
"""

import csv
import io
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from ..core.errores import DatosInsuficientes
from ..dominio.transacciones import Transaccion


class FormatoCSV(BaseModel):
    delimitador: Literal[";", ",", "\t", "|"] = ";"
    separador_decimal: Literal[",", "."] = ","
    formato_fecha: str = Field(default="%d/%m/%Y", max_length=20)
    codificacion: Literal["utf-8", "utf-8-sig", "latin-1"] = "utf-8-sig"
    omitir_filas_invalidas: bool = False
    # campo de Transaccion -> nombre de la columna en el archivo
    columnas: dict[str, str] = Field(
        default_factory=lambda: {
            "id": "id",
            "monto": "monto",
            "moneda": "moneda",
            "fecha": "fecha",
            "canal": "canal",
            "tipo": "tipo",
            "cuenta": "cuenta",
            "tasa_bcv": "tasa_bcv",
        }
    )


def _a_decimal(texto: str, separador_decimal: str) -> Decimal:
    limpio = texto.strip().replace(" ", "").replace("Bs.", "").replace("Bs", "").replace("$", "")
    if separador_decimal == ",":
        limpio = limpio.replace(".", "").replace(",", ".")
    else:
        limpio = limpio.replace(",", "")
    return Decimal(limpio)


def _a_clave(texto: str) -> str:
    """'Pago Móvil' -> 'pago_movil'."""
    sin_acentos = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sin_acentos.strip().lower().replace(" ", "_").replace("-", "_")


def _a_fecha(texto: str, formato: str) -> date:
    texto = texto.strip()
    try:
        return datetime.strptime(texto, formato).date()
    except ValueError:
        return date.fromisoformat(texto[:10])


def _describir_error(error: Exception) -> str:
    if isinstance(error, ValidationError):
        detalle = error.errors()[0]
        return f"{'.'.join(str(p) for p in detalle['loc'])}: {detalle['msg']}"
    if isinstance(error, InvalidOperation):
        return "monto o tasa con formato numérico inválido"
    return str(error)


def leer_transacciones_csv(
    contenido: bytes, formato: FormatoCSV, max_filas: int
) -> tuple[list[Transaccion], int]:
    """Devuelve las transacciones leídas y cuántas filas inválidas se omitieron."""
    try:
        texto = contenido.decode(formato.codificacion)
    except UnicodeDecodeError as error:
        raise DatosInsuficientes(f"No se pudo decodificar el archivo como {formato.codificacion}") from error

    lector = csv.DictReader(io.StringIO(texto), delimiter=formato.delimitador)
    cabeceras = {c.strip().lower() for c in lector.fieldnames or []}
    columnas = {campo: col.strip().lower() for campo, col in formato.columnas.items()}
    if columnas.get("monto") not in cabeceras:
        raise DatosInsuficientes(
            f"El archivo no tiene la columna de monto '{formato.columnas.get('monto')}'. "
            f"Columnas encontradas: {sorted(cabeceras)}"
        )

    transacciones: list[Transaccion] = []
    errores: list[str] = []
    omitidas = 0
    for numero, fila in enumerate(lector, start=2):
        if len(transacciones) >= max_filas:
            raise DatosInsuficientes(f"El archivo supera el máximo de {max_filas} filas")
        fila = {k.strip().lower(): (v or "").strip() for k, v in fila.items() if isinstance(k, str)}
        datos: dict = {}
        try:
            for campo, columna in columnas.items():
                valor = fila.get(columna, "")
                if not valor:
                    continue
                if campo in ("monto", "tasa_bcv"):
                    datos[campo] = _a_decimal(valor, formato.separador_decimal)
                elif campo == "fecha":
                    datos[campo] = _a_fecha(valor, formato.formato_fecha)
                elif campo == "moneda":
                    datos[campo] = valor.upper()
                elif campo in ("canal", "tipo"):
                    datos[campo] = _a_clave(valor)
                else:
                    datos[campo] = valor
            transacciones.append(Transaccion.model_validate(datos))
        except (InvalidOperation, ValueError) as error:
            if formato.omitir_filas_invalidas:
                omitidas += 1
            else:
                errores.append(f"fila {numero}: {_describir_error(error)}")
                if len(errores) >= 10:
                    break

    if errores:
        raise DatosInsuficientes("Filas inválidas en el CSV: " + "; ".join(errores))
    return transacciones, omitidas
