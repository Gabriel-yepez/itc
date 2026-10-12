"""Doble factor (TOTP), registro de auditoría con alertas y cifrado de datos en la base."""

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from sqlalchemy import Engine, text
from sqlalchemy.exc import DBAPIError

from api_fraude_detection.core import totp
from api_fraude_detection.core.cifrado import (
    CONTEXTO_ANALISIS_DESCRIPCION,
    CONTEXTO_ANALISIS_RESULTADO,
    CONTEXTO_TOTP_SECRETO,
    Cifrador,
)
from api_fraude_detection.core.config import Settings
from api_fraude_detection.main import create_app
from api_fraude_detection.modelos.dominio.entidades import EventoAuditoria, Severidad
from api_fraude_detection.modelos.persistencia.esquema import aplicar_migraciones, revertir_migraciones
from api_fraude_detection.modelos.servicios.auditoria import NotificadorAlertas

from .conftest import ADMIN_CLAVE, ADMIN_USUARIO, CLAVE_CIFRADO_PRUEBAS, crear_usuario_listo, montos_benford

CIFRADOR = Cifrador([CLAVE_CIFRADO_PRUEBAS])


def _login(cliente: TestClient, usuario: str = ADMIN_USUARIO, clave: str = ADMIN_CLAVE):
    return cliente.post("/auth/login", json={"usuario": usuario, "contrasena": clave})


def _csrf(cliente: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": cliente.cookies.get("csrf_token")}


def _codigo(secreto: str, pasos_adelante: int = 0) -> str:
    """Código TOTP de ahora (o de un paso posterior, para no repetir uno ya usado)."""
    paso = totp.paso(datetime.now(UTC)) + pasos_adelante
    return totp.hotp(totp._clave(secreto), paso)


@contextmanager
def _app_con_doble_factor(settings: Settings, bd: Engine, **cambios) -> Iterator[TestClient]:
    """App con el doble factor obligatorio para admins (como en producción)."""
    config = settings.model_copy(update={"exigir_segundo_factor_admin": True, **cambios})
    with TestClient(create_app(config)) as cliente:
        with bd.begin() as conexion:
            conexion.execute(text("UPDATE usuarios SET debe_cambiar_contrasena = false"))
        yield cliente


def _activar_doble_factor(cliente: TestClient, usuario: str = ADMIN_USUARIO, clave: str = ADMIN_CLAVE):
    """Configura y activa el doble factor; devuelve (secreto, códigos de recuperación)."""
    assert _login(cliente, usuario, clave).status_code == 200
    r = cliente.post("/auth/segundo-factor/configurar", json={"contrasena": clave}, headers=_csrf(cliente))
    assert r.status_code == 200, r.text
    secreto = r.json()["secreto"]
    r = cliente.post(
        "/auth/segundo-factor/activar", json={"codigo": _codigo(secreto)}, headers=_csrf(cliente)
    )
    assert r.status_code == 200, r.text
    return secreto, r.json()["codigos_recuperacion"]


def _eventos(bd: Engine) -> list[tuple[str, str, str | None]]:
    with bd.connect() as conexion:
        return list(
            conexion.execute(
                text("SELECT tipo, severidad, nombre_usuario FROM eventos_auditoria ORDER BY id")
            )
        )


# ------------------------------------------------------------------ doble factor


def test_admin_sin_doble_factor_solo_puede_configurarlo(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as cliente:
        r = _login(cliente)
        assert r.status_code == 200 and r.json()["usuario"]["debe_configurar_segundo_factor"] is True
        r = cliente.get("/perfiles")
        assert r.status_code == 403 and "verificación en dos pasos" in r.json()["detail"]
        assert cliente.get("/auth/sesion").status_code == 200


def test_flujo_completo_de_doble_factor(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as cliente:
        assert _login(cliente).status_code == 200
        malo = cliente.post(
            "/auth/segundo-factor/configurar", json={"contrasena": "no-es"}, headers=_csrf(cliente)
        )
        assert malo.status_code == 401

        r = cliente.post(
            "/auth/segundo-factor/configurar", json={"contrasena": ADMIN_CLAVE}, headers=_csrf(cliente)
        )
        configuracion = r.json()
        assert configuracion["uri"].startswith("otpauth://totp/")
        assert configuracion["qr"].startswith("data:image/svg+xml")
        secreto = configuracion["secreto"]

        r = cliente.post("/auth/segundo-factor/activar", json={"codigo": "000000"}, headers=_csrf(cliente))
        assert r.status_code == 401 or _codigo(secreto) == "000000"
        r = cliente.post(
            "/auth/segundo-factor/activar", json={"codigo": _codigo(secreto)}, headers=_csrf(cliente)
        )
        codigos = r.json()["codigos_recuperacion"]
        assert len(codigos) == 10 and len(set(codigos)) == 10
        assert cliente.get("/auth/sesion").status_code == 401  # activar cierra todas las sesiones

        # Ahora la contraseña sola no abre sesión.
        r = _login(cliente)
        assert r.json()["segundo_factor_requerido"] is True
        assert r.json()["usuario"] is None and r.json()["csrf_token"] is None
        assert "httponly" in r.headers["set-cookie"].lower() and "desafio_2fa=" in r.headers["set-cookie"]
        assert cliente.get("/perfiles").status_code == 401

        codigo = _codigo(secreto, pasos_adelante=1)  # el de activación ya se usó
        r = cliente.post("/auth/segundo-factor", json={"codigo": codigo})
        assert r.status_code == 200 and r.json()["usuario"]["segundo_factor_activo"] is True
        assert cliente.get("/perfiles").status_code == 200

        # El mismo código no sirve dos veces, aunque siga vigente.
        cliente.post("/auth/logout", headers=_csrf(cliente))
        _login(cliente)
        assert cliente.post("/auth/segundo-factor", json={"codigo": codigo}).status_code == 401

        # Un código de recuperación sirve una sola vez.
        assert cliente.post("/auth/segundo-factor", json={"codigo": codigos[0].upper()}).status_code == 200
        cliente.post("/auth/logout", headers=_csrf(cliente))
        _login(cliente)
        assert cliente.post("/auth/segundo-factor", json={"codigo": codigos[0]}).status_code == 401


def test_sin_desafio_vigente_hay_que_empezar_de_nuevo(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as cliente:
        secreto, _ = _activar_doble_factor(cliente)
        cliente.cookies.clear()
        r = cliente.post("/auth/segundo-factor", json={"codigo": _codigo(secreto, 1)})
        assert r.status_code == 401 and "expiró" in r.json()["detail"]

        _login(cliente)
        with bd_limpia.begin() as conexion:
            conexion.execute(
                text("UPDATE desafios_segundo_factor SET expira_en = now() - interval '1 second'")
            )
        assert cliente.post("/auth/segundo-factor", json={"codigo": _codigo(secreto, 1)}).status_code == 401


def test_codigos_incorrectos_cuentan_como_intentos_fallidos(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as cliente:
        secreto, _ = _activar_doble_factor(cliente)
        _login(cliente)
        validos = {_codigo(secreto, d) for d in (-1, 0, 1)}
        incorrectos = [c for c in ("111111", "222222", "333333", "444444") if c not in validos][:3]
        for codigo in incorrectos:  # max_intentos_fallidos = 3 en las pruebas
            assert cliente.post("/auth/segundo-factor", json={"codigo": codigo}).status_code == 401
        assert cliente.post("/auth/segundo-factor", json={"codigo": _codigo(secreto, 1)}).status_code == 429


def test_secreto_totp_se_guarda_cifrado(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as cliente:
        secreto, codigos = _activar_doble_factor(cliente)
    with bd_limpia.connect() as conexion:
        crudo, hashes = conexion.execute(
            text("SELECT totp_secreto, codigos_recuperacion FROM usuarios WHERE nombre_usuario = 'admin'")
        ).one()
    assert secreto.encode() not in bytes(crudo)
    assert CIFRADOR.descifrar_texto(crudo, CONTEXTO_TOTP_SECRETO) == secreto
    assert not set(codigos) & set(hashes)  # de los códigos solo se guarda el hash


def _pasa_el_tiempo(bd: Engine) -> None:
    """Olvida el último código usado, como si hubieran pasado 30 s (así hay un código nuevo válido)."""
    with bd.begin() as conexion:
        conexion.execute(text("UPDATE usuarios SET totp_ultimo_paso = NULL"))


def test_analista_puede_desactivar_su_doble_factor_y_el_admin_no(settings: Settings, bd_limpia: Engine):
    with _app_con_doble_factor(settings, bd_limpia) as admin:
        secreto_admin, _ = _activar_doble_factor(admin)
        _login(admin)
        assert (
            admin.post("/auth/segundo-factor", json={"codigo": _codigo(secreto_admin, 1)}).status_code == 200
        )
        analista, _ = crear_usuario_listo(admin, _csrf(admin), "analista1", "clave-analista-123")
        secreto, _ = _activar_doble_factor(analista, "analista1", "clave-analista-123")
        _login(analista, "analista1", "clave-analista-123")
        assert analista.post("/auth/segundo-factor", json={"codigo": _codigo(secreto, 1)}).status_code == 200
        _pasa_el_tiempo(bd_limpia)

        validos = {_codigo(secreto, d) for d in (-1, 0, 1)}
        incorrecto = next(c for c in ("123456", "654321", "111111") if c not in validos)
        cuerpo = {"contrasena": "clave-analista-123", "codigo": incorrecto}
        assert (
            analista.post("/auth/segundo-factor/desactivar", json=cuerpo, headers=_csrf(analista)).status_code
            == 401
        )
        cuerpo["codigo"] = _codigo(secreto)
        assert (
            analista.post("/auth/segundo-factor/desactivar", json=cuerpo, headers=_csrf(analista)).status_code
            == 204
        )
        assert _login(analista, "analista1", "clave-analista-123").json()["segundo_factor_requerido"] is False

        r = admin.post(
            "/auth/segundo-factor/desactivar",
            json={"contrasena": ADMIN_CLAVE, "codigo": _codigo(secreto_admin)},
            headers=_csrf(admin),
        )
        assert r.status_code == 403 and "obligatoria" in r.json()["detail"]


def test_otro_admin_restablece_el_doble_factor(cliente: TestClient, admin, bd_limpia: Engine):
    analista, _ = crear_usuario_listo(cliente, admin, "analista1", "clave-analista-123")
    _activar_doble_factor(analista, "analista1", "clave-analista-123")
    assert _login(analista, "analista1", "clave-analista-123").json()["segundo_factor_requerido"] is True
    analista_id = cliente.get("/usuarios").json()[1]["id"]
    admin_id = cliente.get("/auth/sesion").json()["usuario"]["id"]

    assert cliente.post(f"/usuarios/{admin_id}/restablecer-segundo-factor", headers=admin).status_code == 409
    r = cliente.post(f"/usuarios/{analista_id}/restablecer-segundo-factor", headers=admin)
    assert r.status_code == 200 and r.json()["segundo_factor_activo"] is False

    assert _login(analista, "analista1", "clave-analista-123").json()["segundo_factor_requerido"] is False
    assert ("segundo_factor_restablecido", "critica", ADMIN_USUARIO) in _eventos(bd_limpia)


# ------------------------------------------------------------------ auditoría y alertas


def test_eventos_de_seguridad_quedan_auditados(cliente: TestClient, admin, bd_limpia: Engine):
    _login(cliente, clave="incorrecta")
    cuerpo = {"nombre_usuario": "jefa", "contrasena": "clave-jefa-segura-1", "rol": "admin"}
    cliente.post("/usuarios", json=cuerpo, headers=admin)
    cliente.post("/analisis", json={"transacciones": [{"monto": "100"}], "guardar": False}, headers=admin)

    eventos = _eventos(bd_limpia)
    assert ("inicio_sesion", "info", ADMIN_USUARIO) in eventos
    assert ("inicio_sesion_fallido", "info", ADMIN_USUARIO) in eventos
    assert ("usuario_creado", "critica", ADMIN_USUARIO) in eventos  # nueva cuenta de administrador
    assert ("analisis_ejecutado", "info", ADMIN_USUARIO) in eventos

    todos = cliente.get("/auditoria").json()
    assert todos[0]["tipo"] == "analisis_ejecutado"  # más reciente primero
    alertas = cliente.get("/auditoria", params={"solo_alertas": True}).json()
    assert alertas and all(e["severidad"] in {"advertencia", "critica"} for e in alertas)
    creado = next(e for e in alertas if e["tipo"] == "usuario_creado")
    assert creado["detalle"] == {"rol": "admin", "usuario_afectado": "jefa"}


def test_auditoria_solo_para_administradores(cliente: TestClient, admin, bd_limpia: Engine):
    analista, _ = crear_usuario_listo(cliente, admin, "analista1", "clave-analista-123")
    assert analista.get("/auditoria").status_code == 403
    assert ("acceso_denegado", "advertencia", "analista1") in _eventos(bd_limpia)


def test_registro_de_auditoria_es_inmutable(cliente: TestClient, admin, bd_limpia: Engine):
    assert _eventos(bd_limpia)
    for sentencia in ("UPDATE eventos_auditoria SET tipo = 'borrado'", "DELETE FROM eventos_auditoria"):
        with pytest.raises(DBAPIError, match="inmutable"), bd_limpia.begin() as conexion:
            conexion.execute(text(sentencia))


def test_csrf_invalido_genera_alerta(cliente: TestClient, admin, bd_limpia: Engine):
    r = cliente.post("/perfiles", json={"nombre": "x"}, headers={"X-CSRF-Token": "falso"})
    assert r.status_code == 403
    assert ("csrf_invalido", "advertencia", ADMIN_USUARIO) in _eventos(bd_limpia)


def test_bloqueo_por_intentos_dispara_una_sola_alerta(cliente: TestClient, bd_limpia: Engine):
    recibidas: list[EventoAuditoria] = []

    class Registro(NotificadorAlertas):
        def notificar(self, evento: EventoAuditoria) -> None:
            recibidas.append(evento)

    cliente.app.state.notificador_alertas = Registro()
    for _ in range(5):  # 3 fallos (el máximo) y 2 rechazos más
        _login(cliente, clave="incorrecta")
    assert [e.tipo for e in recibidas] == ["acceso_bloqueado"]
    assert recibidas[0].severidad is Severidad.ADVERTENCIA and recibidas[0].nombre_usuario == ADMIN_USUARIO


def test_alertas_van_a_los_logs_y_al_webhook(caplog):
    enviadas = []
    notificador = NotificadorAlertas(
        "https://alertas.example/hook",
        enviar=lambda url, cuerpo, segundos: enviadas.append((url, cuerpo)),
        en_segundo_plano=False,
    )
    evento = EventoAuditoria(
        tipo="segundo_factor_restablecido",
        severidad=Severidad.CRITICA,
        nombre_usuario="ana",
        ip="203.0.113.9",
        id=7,
    )
    with caplog.at_level(logging.WARNING, logger="api_fraude_detection.alertas"):
        notificador.notificar(evento)
    assert any(
        r.levelno == logging.CRITICAL and "segundo_factor_restablecido" in r.message for r in caplog.records
    )
    url, cuerpo = enviadas[0]
    assert url == "https://alertas.example/hook"
    assert cuerpo["text"].startswith("[CRITICA] segundo_factor_restablecido")
    assert cuerpo["evento"]["ip"] == "203.0.113.9"


def test_webhook_que_falla_no_rompe_la_peticion(caplog):
    def caido(*_):
        raise TimeoutError("sin respuesta")

    notificador = NotificadorAlertas("https://alertas.example/hook", enviar=caido, en_segundo_plano=False)
    notificador.notificar(EventoAuditoria(tipo="x", severidad=Severidad.ADVERTENCIA))
    assert "No se pudo entregar la alerta" in caplog.text


def test_webhook_debe_ser_https():
    with pytest.raises(ValidationError):
        Settings(alertas_webhook_url="http://alertas.example/hook")


# ------------------------------------------------------------------ cifrado en la base


def test_analisis_se_guardan_cifrados(cliente: TestClient, admin, bd_limpia: Engine):
    cuerpo = {
        "transacciones": [{"monto": str(m), "cuenta": "cta-0777"} for m in montos_benford(50)],
        "descripcion": "Revisión cta-0777 Maracay",
        "parametros": {"agrupar_por": "cuenta", "tamano_muestra_minimo": 30},
    }
    analisis_id = cliente.post("/analisis", json=cuerpo, headers=admin).json()["id"]
    with bd_limpia.connect() as conexion:
        descripcion, resultado = conexion.execute(
            text("SELECT descripcion, resultado FROM analisis WHERE id = :id"), {"id": analisis_id}
        ).one()
    assert b"cta-0777" not in bytes(descripcion) and b"cta-0777" not in bytes(resultado)
    assert CIFRADOR.descifrar_texto(descripcion, CONTEXTO_ANALISIS_DESCRIPCION) == "Revisión cta-0777 Maracay"
    assert CIFRADOR.descifrar_json(resultado, CONTEXTO_ANALISIS_RESULTADO)["grupos"][0]["clave"] == "cta-0777"
    r = cliente.get(f"/analisis/{analisis_id}")
    assert r.json()["descripcion"] == "Revisión cta-0777 Maracay"


def test_sin_clave_de_cifrado_la_api_no_arranca(settings: Settings):
    with pytest.raises(RuntimeError, match="FRAUDE_CLAVES_CIFRADO"):
        create_app(settings.model_copy(update={"claves_cifrado": None}))


def test_migracion_cifra_los_analisis_existentes(bd_limpia: Engine):
    clave = SecretStr(CLAVE_CIFRADO_PRUEBAS)
    revertir_migraciones(bd_limpia, "eae64f73f09e", clave)
    try:
        with bd_limpia.begin() as conexion:
            usuario_id = conexion.execute(
                text(
                    "INSERT INTO usuarios (nombre_usuario, hash_contrasena, rol) "
                    "VALUES ('ana', 'x', 'analista') RETURNING id"
                )
            ).scalar_one()
            conexion.execute(
                text(
                    "INSERT INTO analisis (usuario_id, descripcion, parametros, resultado, puntaje, "
                    "nivel_riesgo, total_transacciones) "
                    "VALUES (:u, 'cuenta cta-0910', '{}', '{\"puntaje\": 100}', 100, 'critico', 1)"
                ),
                {"u": usuario_id},
            )
        aplicar_migraciones(bd_limpia, clave)
    finally:
        aplicar_migraciones(bd_limpia, clave)  # el esquema queda en la última versión pase lo que pase

    with bd_limpia.connect() as conexion:
        descripcion, resultado = conexion.execute(text("SELECT descripcion, resultado FROM analisis")).one()
    assert b"cta-0910" not in bytes(descripcion)
    assert CIFRADOR.descifrar_texto(descripcion, CONTEXTO_ANALISIS_DESCRIPCION) == "cuenta cta-0910"
    assert CIFRADOR.descifrar_json(resultado, CONTEXTO_ANALISIS_RESULTADO) == {"puntaje": 100}
