"""Códigos de un solo uso basados en tiempo (TOTP, RFC 6238) para el doble factor.

Compatible con Google Authenticator, Microsoft Authenticator, Aegis, 1Password, etc.:
HMAC-SHA1, 6 dígitos, pasos de 30 segundos.
"""

import base64
import hashlib
import hmac
import secrets
from datetime import datetime
from urllib.parse import quote, urlencode

PERIODO_SEGUNDOS = 30
DIGITOS = 6
# Se acepta el paso anterior y el siguiente: tolera relojes desfasados hasta ±30 s.
TOLERANCIA_PASOS = 1


def generar_secreto() -> str:
    """160 bits aleatorios en base32 (lo que se escribe a mano si no se puede leer el QR)."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _clave(secreto: str) -> bytes:
    relleno = "=" * (-len(secreto) % 8)
    return base64.b32decode(secreto.upper() + relleno)


def hotp(clave: bytes, contador: int, digitos: int = DIGITOS, algoritmo: str = "sha1") -> str:
    """RFC 4226: HMAC del contador y "truncado dinámico" a `digitos` cifras."""
    resumen = hmac.new(clave, contador.to_bytes(8, "big"), getattr(hashlib, algoritmo)).digest()
    desplazamiento = resumen[-1] & 0x0F
    numero = int.from_bytes(resumen[desplazamiento : desplazamiento + 4], "big") & 0x7FFFFFFF
    return str(numero % 10**digitos).zfill(digitos)


def paso(momento: datetime) -> int:
    return int(momento.timestamp()) // PERIODO_SEGUNDOS


def codigo(secreto: str, momento: datetime) -> str:
    return hotp(_clave(secreto), paso(momento))


def verificar(secreto: str, codigo_recibido: str, momento: datetime, ultimo_paso: int | None) -> int | None:
    """Devuelve el paso del código si es válido, o None.

    Un código ya usado (paso <= `ultimo_paso`) se rechaza aunque siga vigente: alguien que lo vea
    por encima del hombro o lo intercepte no puede reutilizarlo.
    """
    recibido = codigo_recibido.strip().replace(" ", "")
    if len(recibido) != DIGITOS or not recibido.isdigit():
        return None
    clave, actual = _clave(secreto), paso(momento)
    for candidato in range(actual - TOLERANCIA_PASOS, actual + TOLERANCIA_PASOS + 1):
        if ultimo_paso is not None and candidato <= ultimo_paso:
            continue
        if hmac.compare_digest(hotp(clave, candidato), recibido):
            return candidato
    return None


def uri_aprovisionamiento(secreto: str, cuenta: str, emisor: str) -> str:
    """URI otpauth:// que las apps leen del código QR."""
    etiqueta = quote(f"{emisor}:{cuenta}")
    parametros = urlencode(
        {
            "secret": secreto,
            "issuer": emisor,
            "algorithm": "SHA1",
            "digits": DIGITOS,
            "period": PERIODO_SEGUNDOS,
        }
    )
    return f"otpauth://totp/{etiqueta}?{parametros}"
