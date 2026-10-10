import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()

# Hash señuelo: se verifica cuando el usuario no existe para que el tiempo de respuesta
# no revele qué nombres de usuario son válidos.
_HASH_SENUELO = _hasher.hash(secrets.token_urlsafe(16))


def hashear_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(hash_guardado: str | None, contrasena: str) -> bool:
    try:
        return _hasher.verify(hash_guardado or _HASH_SENUELO, contrasena) and hash_guardado is not None
    except VerificationError, InvalidHashError:
        return False


def requiere_rehash(hash_guardado: str) -> bool:
    return _hasher.check_needs_rehash(hash_guardado)


def generar_token() -> str:
    """Token opaco de alta entropía (256 bits) para sesión o CSRF."""
    return secrets.token_urlsafe(32)


def hashear_token(token: str) -> str:
    """Los tokens se guardan hasheados: una fuga de la BD no permite secuestrar sesiones."""
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_iguales(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
