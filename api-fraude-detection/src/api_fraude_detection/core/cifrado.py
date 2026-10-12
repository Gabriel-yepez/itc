"""Cifrado de datos sensibles en la base con AES-256-GCM.

Formato de cada valor cifrado:  versión (1 byte) | huella de la clave (4) | nonce (12) | texto + etiqueta

- La huella identifica con qué clave se cifró: para rotar se agrega una clave nueva al principio
  de FRAUDE_CLAVES_CIFRADO y las anteriores siguen sirviendo para descifrar.
- Cada valor se cifra con el nombre de su columna como "dato asociado": un valor copiado a otra
  columna (o a otra tabla) no se descifra.
- GCM autentica: un valor alterado en la base se rechaza en lugar de devolver basura.

Generar una clave nueva:   uv run python -m api_fraude_detection.core.cifrado
"""

import base64
import hashlib
import json
import os
import secrets
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_VERSION = b"\x01"
_LARGO_HUELLA = 4
_LARGO_NONCE = 12
_LARGO_CLAVE = 32

# "Dato asociado" de cada columna cifrada: el valor solo se descifra en su propia columna.
CONTEXTO_ANALISIS_DESCRIPCION = "analisis.descripcion"
CONTEXTO_ANALISIS_RESULTADO = "analisis.resultado"
CONTEXTO_TOTP_SECRETO = "usuarios.totp_secreto"


class ErrorCifrado(ValueError):
    pass


def generar_clave() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(_LARGO_CLAVE)).decode()


def _huella(clave: bytes) -> bytes:
    return hashlib.sha256(clave).digest()[:_LARGO_HUELLA]


def _decodificar(clave: str) -> bytes:
    try:
        crudo = base64.urlsafe_b64decode(clave.strip().encode())
    except ValueError as error:
        raise ErrorCifrado("Clave de cifrado con formato inválido (se espera base64 URL-safe)") from error
    if len(crudo) != _LARGO_CLAVE:
        raise ErrorCifrado(f"Cada clave de cifrado debe tener {_LARGO_CLAVE} bytes ({len(crudo)} recibidos)")
    return crudo


class Cifrador:
    def __init__(self, claves: list[str]):
        if not claves:
            raise ErrorCifrado("Se necesita al menos una clave de cifrado")
        crudas = [_decodificar(c) for c in claves]
        self._por_huella = {_huella(c): AESGCM(c) for c in crudas}
        if len(self._por_huella) != len(crudas):
            raise ErrorCifrado("Hay claves de cifrado repetidas")
        self._actual = _huella(crudas[0])

    @classmethod
    def desde_texto(cls, claves: str) -> Cifrador:
        """Claves separadas por comas; la primera es la que cifra."""
        return cls([c for c in claves.split(",") if c.strip()])

    def cifrar(self, datos: bytes, contexto: str) -> bytes:
        nonce = os.urandom(_LARGO_NONCE)
        texto = self._por_huella[self._actual].encrypt(nonce, datos, contexto.encode())
        return _VERSION + self._actual + nonce + texto

    def descifrar(self, valor: bytes, contexto: str) -> bytes:
        valor = bytes(valor)
        cabecera = 1 + _LARGO_HUELLA + _LARGO_NONCE
        if len(valor) <= cabecera or valor[:1] != _VERSION:
            raise ErrorCifrado(f"Valor cifrado con formato desconocido en {contexto}")
        huella, nonce = valor[1 : 1 + _LARGO_HUELLA], valor[1 + _LARGO_HUELLA : cabecera]
        aes = self._por_huella.get(huella)
        if aes is None:
            raise ErrorCifrado(f"El valor de {contexto} se cifró con una clave que ya no está configurada")
        try:
            return aes.decrypt(nonce, valor[cabecera:], contexto.encode())
        except InvalidTag as error:
            raise ErrorCifrado(f"El valor cifrado de {contexto} fue alterado o no corresponde") from error

    def cifrar_texto(self, texto: str, contexto: str) -> bytes:
        return self.cifrar(texto.encode(), contexto)

    def descifrar_texto(self, valor: bytes, contexto: str) -> str:
        return self.descifrar(valor, contexto).decode()

    def cifrar_json(self, valor: Any, contexto: str) -> bytes:
        return self.cifrar(json.dumps(valor, ensure_ascii=False, separators=(",", ":")).encode(), contexto)

    def descifrar_json(self, valor: bytes, contexto: str) -> Any:
        return json.loads(self.descifrar(valor, contexto))

    def usa_clave_actual(self, valor: bytes) -> bool:
        return bytes(valor)[1 : 1 + _LARGO_HUELLA] == self._actual


if __name__ == "__main__":
    print(generar_clave())
