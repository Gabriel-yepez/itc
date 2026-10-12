"""Pruebas unitarias del cifrado de columnas y del TOTP (sin base de datos)."""

from datetime import UTC, datetime

import pytest

from api_fraude_detection.core import totp
from api_fraude_detection.core.cifrado import Cifrador, ErrorCifrado, generar_clave

# ------------------------------------------------------------------ cifrado


def test_cifra_y_descifra_con_contexto():
    cifrador = Cifrador([generar_clave()])
    valor = cifrador.cifrar_texto("cta-0777: 9.500 US$", "analisis.descripcion")
    assert b"cta-0777" not in valor
    assert cifrador.descifrar_texto(valor, "analisis.descripcion") == "cta-0777: 9.500 US$"


def test_cada_cifrado_usa_un_nonce_distinto():
    cifrador = Cifrador([generar_clave()])
    assert cifrador.cifrar(b"igual", "c") != cifrador.cifrar(b"igual", "c")


def test_valor_copiado_a_otra_columna_no_se_descifra():
    cifrador = Cifrador([generar_clave()])
    valor = cifrador.cifrar(b"secreto", "usuarios.totp_secreto")
    with pytest.raises(ErrorCifrado):
        cifrador.descifrar(valor, "analisis.descripcion")


def test_valor_alterado_se_rechaza():
    cifrador = Cifrador([generar_clave()])
    valor = bytearray(cifrador.cifrar(b"monto 1.000", "c"))
    valor[-1] ^= 0x01
    with pytest.raises(ErrorCifrado, match="alterado"):
        cifrador.descifrar(bytes(valor), "c")


def test_rotacion_de_claves():
    vieja, nueva = generar_clave(), generar_clave()
    valor_viejo = Cifrador([vieja]).cifrar(b"dato", "c")

    rotado = Cifrador.desde_texto(f"{nueva},{vieja}")
    assert rotado.descifrar(valor_viejo, "c") == b"dato"  # la vieja sigue descifrando
    assert not rotado.usa_clave_actual(valor_viejo)
    assert rotado.usa_clave_actual(rotado.cifrar(b"dato", "c"))  # lo nuevo usa la nueva

    with pytest.raises(ErrorCifrado, match="ya no está configurada"):
        Cifrador([nueva]).descifrar(valor_viejo, "c")


@pytest.mark.parametrize("claves", [[], ["no-es-base64!"], ["YWJj"], ["mismo", "mismo"]])
def test_claves_invalidas(claves):
    if claves == ["mismo", "mismo"]:
        claves = [generar_clave()] * 2
    with pytest.raises(ErrorCifrado):
        Cifrador(claves)


# ------------------------------------------------------------------ TOTP

# Vectores de prueba del RFC 6238 (apéndice B), SHA-1, 8 dígitos.
_SECRETO_RFC = b"12345678901234567890"


@pytest.mark.parametrize(
    ("segundos", "esperado"),
    [
        (59, "94287082"),
        (1111111109, "07081804"),
        (1111111111, "14050471"),
        (1234567890, "89005924"),
        (2000000000, "69279037"),
        (20000000000, "65353130"),
    ],
)
def test_vectores_rfc_6238(segundos, esperado):
    assert totp.hotp(_SECRETO_RFC, segundos // 30, digitos=8) == esperado


def test_verificar_acepta_desfase_de_un_paso_y_no_mas():
    secreto = totp.generar_secreto()
    ahora = datetime(2026, 10, 11, 12, 0, 15, tzinfo=UTC)
    paso = totp.paso(ahora)
    for desfase in (-1, 0, 1):
        codigo = totp.hotp(totp._clave(secreto), paso + desfase)
        assert totp.verificar(secreto, codigo, ahora, None) == paso + desfase
    codigo_viejo = totp.hotp(totp._clave(secreto), paso - 2)
    assert totp.verificar(secreto, codigo_viejo, ahora, None) is None


def test_verificar_rechaza_un_codigo_ya_usado():
    secreto = totp.generar_secreto()
    ahora = datetime(2026, 10, 11, 12, 0, 15, tzinfo=UTC)
    codigo = totp.codigo(secreto, ahora)
    paso = totp.verificar(secreto, codigo, ahora, None)
    assert paso is not None
    assert totp.verificar(secreto, codigo, ahora, ultimo_paso=paso) is None


@pytest.mark.parametrize("codigo", ["", "12345", "1234567", "abcdef", "12 34 5"])
def test_verificar_rechaza_formatos_invalidos(codigo):
    assert totp.verificar(totp.generar_secreto(), codigo, datetime.now(UTC), None) is None


def test_uri_de_aprovisionamiento():
    uri = totp.uri_aprovisionamiento("JBSWY3DPEHPK3PXP", "admin", "Auditoría")
    assert uri.startswith("otpauth://totp/Auditor%C3%ADa%3Aadmin?")
    assert "secret=JBSWY3DPEHPK3PXP" in uri and "digits=6" in uri and "period=30" in uri
