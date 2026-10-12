"""Regresiones de seguridad: montos extremos, fuerza bruta, enumeración de cuentas y consumo de recursos."""

import asyncio
import threading
import tomllib
from collections import Counter
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Engine, text
from starlette.responses import JSONResponse

from api_fraude_detection.core.config import Settings
from api_fraude_detection.core.errores import DemasiadasSolicitudes
from api_fraude_detection.core.limites import MB, LimitadorConcurrencia, LimiteCuerpo
from api_fraude_detection.core.seguridad import hashear_token
from api_fraude_detection.main import create_app
from api_fraude_detection.modelos.dominio.entidades import Sesion
from api_fraude_detection.modelos.dominio.parametros import (
    MAX_UMBRALES_VIGILADOS,
    ParametrosDeteccion,
    UmbralVigilado,
)
from api_fraude_detection.modelos.dominio.transacciones import Transaccion
from api_fraude_detection.modelos.persistencia.base import crear_fabrica_sesiones
from api_fraude_detection.modelos.repositorios.sql import RepositorioIntentosAccesoSQL, RepositorioSesionesSQL
from api_fraude_detection.modelos.servicios.importacion_csv import FormatoCSV

from .conftest import ADMIN_CLAVE, ADMIN_USUARIO, crear_usuario_listo, montos_benford

# ------------------------------------------------------------------ montos extremos
# Un Decimal admite exponentes de hasta ±999.999.999. Sin tope, "1e999999999" obligaba a
# construir un entero de mil millones de cifras en la prueba de últimos dos dígitos y dejaba
# el proceso de la API sin responder.

MONTOS_EXTREMOS = ["1e999999999", "1e400", "1e19", "1e-400", "1e-7", "1." + "1" * 40]


@pytest.mark.parametrize("monto", MONTOS_EXTREMOS)
def test_transaccion_rechaza_montos_fuera_de_rango(monto):
    with pytest.raises(ValidationError):
        Transaccion(monto=monto)
    with pytest.raises(ValidationError):
        Transaccion(monto="100", tasa_bcv=monto)


@pytest.mark.parametrize("monto", ["1e18", "0.000001", "123456789012345678.12", "36,50".replace(",", ".")])
def test_transaccion_acepta_montos_reales(monto):
    assert Transaccion(monto=monto, tasa_bcv=monto).monto == Decimal(monto)


@pytest.mark.parametrize(
    "cambios",
    [
        {"tasa_bcv_predeterminada": "1e999999999"},
        {"monto_maximo": "1e400"},
        {"monto_minimo": "1e400"},
        {"multiplo_redondo": 10**30},
    ],
)
def test_parametros_rechazan_magnitudes_extremas(cambios):
    with pytest.raises(ValidationError):
        ParametrosDeteccion().con_cambios(cambios)


def test_umbral_vigilado_rechaza_monto_extremo():
    with pytest.raises(ValidationError):
        UmbralVigilado(nombre="x", monto="1e999999999")


def test_api_rechaza_monto_extremo_en_json(cliente: TestClient, admin):
    cuerpo = {"transacciones": [{"monto": "100"}, {"monto": "1e999999999"}], "guardar": False}
    r = cliente.post("/analisis", json=cuerpo, headers=admin)
    assert r.status_code == 422


def test_api_rechaza_tasa_extrema_en_sobrescrituras(cliente: TestClient, admin):
    cuerpo = {
        "transacciones": [{"monto": str(m), "moneda": "USD"} for m in montos_benford(50)],
        "parametros": {"tasa_bcv_predeterminada": "1e999999999"},
        "guardar": False,
    }
    r = cliente.post("/analisis", json=cuerpo, headers=admin)
    assert r.status_code == 422


def test_api_rechaza_monto_extremo_en_csv(cliente: TestClient, admin):
    csv = "monto\n1.234,56\n1e999999999\n"
    r = cliente.post(
        "/analisis/csv",
        files={"archivo": ("extracto.csv", csv.encode(), "text/csv")},
        data={"guardar": "false"},
        headers=admin,
    )
    assert r.status_code == 422
    assert "fila 3" in r.json()["detail"]


# ------------------------------------------------------------------ fuerza bruta concurrente


def _fallos_registrados(motor: Engine, usuario: str = ADMIN_USUARIO) -> int:
    with motor.connect() as conexion:
        return conexion.execute(
            text("SELECT count(*) FROM intentos_acceso WHERE nombre_usuario = :u"), {"u": usuario}
        ).scalar_one()


def _login(cliente: TestClient, usuario: str = ADMIN_USUARIO, clave: str = "incorrecta"):
    return cliente.post("/auth/login", json={"usuario": usuario, "contrasena": clave})


def test_login_concurrente_no_supera_el_maximo_de_intentos(cliente: TestClient, bd_limpia: Engine):
    """Antes, N intentos simultáneos leían el contador a la vez y todos escribían 1: el atacante
    obtenía N contraseñas evaluadas en lugar de `max_intentos_fallidos` (3 en las pruebas)."""
    hilos, barrera = 12, threading.Barrier(12)
    estados: list[int] = []

    def intentar(i: int) -> None:
        barrera.wait()
        estados.append(_login(cliente, clave=f"incorrecta-{i}").status_code)

    trabajadores = [threading.Thread(target=intentar, args=(i,)) for i in range(hilos)]
    for t in trabajadores:
        t.start()
    for t in trabajadores:
        t.join()

    conteo = Counter(estados)
    # Solo 401 significa "contraseña evaluada"; 429 (en curso o cupo agotado) no la evalúa.
    assert set(conteo) <= {401, 429}, conteo
    assert conteo[401] <= 3, conteo
    assert _fallos_registrados(bd_limpia) == conteo[401]


def test_login_con_la_cuenta_ocupada_responde_429_sin_evaluar(cliente: TestClient, bd_limpia: Engine):
    with crear_fabrica_sesiones(bd_limpia)() as db, db.begin():
        RepositorioIntentosAccesoSQL(db).reservar(ADMIN_USUARIO, "198.51.100.7")  # otro intento en curso
        assert _login(cliente).status_code == 429
        assert _login(cliente, clave=ADMIN_CLAVE).status_code == 429

    assert _fallos_registrados(bd_limpia) == 0
    assert _login(cliente, clave=ADMIN_CLAVE).status_code == 200


# ------------------------------------------------------------------ enumeración y bloqueo ajeno


@contextmanager
def _cliente_con(settings: Settings, **cambios) -> Iterator[TestClient]:
    with TestClient(create_app(settings.model_copy(update=cambios))) as c:
        yield c


def _desde_ip(cliente: TestClient, ip: str) -> TestClient:
    """Otro cliente de la misma app con otra IP de origen (sin repetir el arranque)."""
    return TestClient(cliente.app, client=(ip, 40000))


def test_respuestas_identicas_exista_o_no_la_cuenta(cliente: TestClient):
    """Antes la cuenta real respondía 423 «bloqueada» y la inventada siempre 401."""

    def recorrido(usuario: str) -> list[tuple[int, dict]]:
        return [(r.status_code, r.json()) for r in (_login(cliente, usuario) for _ in range(5))]

    real, inventada = recorrido(ADMIN_USUARIO), recorrido("no-existe")
    assert real == inventada
    assert [estado for estado, _ in real] == [401, 401, 401, 429, 429]


def test_un_atacante_no_bloquea_la_cuenta_desde_su_ip(cliente: TestClient):
    atacante = _desde_ip(cliente, "203.0.113.66")
    for _ in range(3):
        assert _login(atacante).status_code == 401
    assert _login(atacante, clave=ADMIN_CLAVE).status_code == 429  # el atacante se bloquea a sí mismo...
    assert _login(cliente, clave=ADMIN_CLAVE).status_code == 200  # ...pero el dueño entra desde su IP


def test_limite_por_usuario_frena_el_ataque_distribuido(settings: Settings):
    with _cliente_con(settings, max_intentos_fallidos_por_usuario=4) as cliente:
        for i in range(4):
            assert _login(_desde_ip(cliente, f"203.0.113.{i}")).status_code == 401
        assert _login(_desde_ip(cliente, "203.0.113.99"), clave=ADMIN_CLAVE).status_code == 429


def test_limite_por_ip_frena_el_rociado_de_contrasenas(settings: Settings):
    with _cliente_con(settings, max_intentos_fallidos_por_ip=4) as cliente:
        for nombre in ("ana", "luis", "maria", "jose"):
            assert _login(cliente, nombre).status_code == 401
        assert _login(cliente, clave=ADMIN_CLAVE).status_code == 429


def test_reactivar_usuario_levanta_sus_bloqueos(cliente: TestClient, admin):
    cuerpo = {"nombre_usuario": "analista1", "contrasena": "clave-analista-123", "rol": "analista"}
    usuario_id = cliente.post("/usuarios", json=cuerpo, headers=admin).json()["id"]
    otro = _desde_ip(cliente, "203.0.113.5")
    for _ in range(3):
        _login(otro, "analista1")
    assert _login(otro, "analista1", "clave-analista-123").status_code == 429

    r = cliente.patch(f"/usuarios/{usuario_id}", json={"activo": True}, headers=admin)
    assert r.status_code == 200
    assert _login(otro, "analista1", "clave-analista-123").status_code == 200


def test_los_fallos_viejos_se_purgan(cliente: TestClient, bd_limpia: Engine):
    with bd_limpia.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO intentos_acceso (nombre_usuario, ip, creado_en) "
                "VALUES ('viejo', '203.0.113.1', now() - interval '1 day')"
            )
        )
    _login(cliente)
    assert _fallos_registrados(bd_limpia, "viejo") == 0
    assert _fallos_registrados(bd_limpia) == 1


# ------------------------------------------------------------------ consumo de recursos


def test_parametros_acotan_listas_costosas():
    umbral = {"nombre": "u", "monto": "1000"}
    with pytest.raises(ValidationError):
        ParametrosDeteccion().con_cambios({"umbrales_vigilados": [umbral] * (MAX_UMBRALES_VIGILADOS + 1)})
    with pytest.raises(ValidationError):
        ParametrosDeteccion().con_cambios({"canales": ["otro"] * 1000})
    with pytest.raises(ValidationError):
        ParametrosDeteccion().con_cambios({"canales_excluidos_redondeo": ["efectivo"] * 1000})
    limite = ParametrosDeteccion().con_cambios({"umbrales_vigilados": [umbral] * MAX_UMBRALES_VIGILADOS})
    assert len(limite.umbrales_vigilados) == MAX_UMBRALES_VIGILADOS


def test_formato_csv_solo_acepta_columnas_conocidas():
    with pytest.raises(ValidationError):
        FormatoCSV(columnas={f"campo_{i}": "x" for i in range(1000)})
    with pytest.raises(ValidationError):
        FormatoCSV(columnas={"monto": "x" * 1000})
    assert FormatoCSV(columnas={"monto": "importe"}).columnas == {"monto": "importe"}


def test_api_rechaza_sobrescritura_con_miles_de_umbrales(cliente: TestClient, admin):
    cuerpo = {
        "transacciones": [{"monto": "100"}],
        "parametros": {"umbrales_vigilados": [{"nombre": "u", "monto": "1000"}] * 5000},
        "guardar": False,
    }
    assert cliente.post("/analisis", json=cuerpo, headers=admin).status_code == 422


def test_json_mayor_al_limite_se_rechaza_sin_leerlo(settings: Settings):
    with _cliente_con(settings, max_tamano_json_mb=1) as cliente:
        cuerpo = {"transacciones": [{"monto": "1234.56"}] * 60_000}  # ≈ 1,2 MB
        r = cliente.post("/analisis", json=cuerpo)
        # 413 aun sin sesión: se corta antes de autenticar o validar nada.
        assert r.status_code == 413
        assert "1 MB" in r.json()["detail"]


def test_cuerpo_sin_content_length_se_corta_al_superar_el_limite(settings: Settings):
    with _cliente_con(settings, max_tamano_json_mb=1) as cliente:
        trozos = (b" " * 256 * 1024 for _ in range(8))  # 2 MB por partes, sin Content-Length
        r = cliente.post("/analisis", content=trozos, headers={"Content-Type": "application/json"})
        assert r.status_code == 413


def test_subida_csv_mayor_al_limite_se_rechaza(settings: Settings):
    with _cliente_con(settings, max_tamano_csv_mb=1) as cliente:
        archivo = b"monto\n" + b"1234,56\n" * 300_000  # ≈ 2,4 MB > 1 MB + margen
        r = cliente.post("/analisis/csv", files={"archivo": ("grande.csv", archivo, "text/csv")})
        assert r.status_code == 413


def test_limitador_reparte_cupos_por_usuario_y_en_total():
    limitador = LimitadorConcurrencia(maximo=2, maximo_por_clave=1)
    with limitador.reservar("ana"):
        with pytest.raises(DemasiadasSolicitudes, match="Ya tiene"):
            with limitador.reservar("ana"):
                pass
        with limitador.reservar("luis"):
            with pytest.raises(DemasiadasSolicitudes, match="otros análisis"):
                with limitador.reservar("maria"):
                    pass
    assert limitador.en_curso == 0
    with limitador.reservar("ana"):  # los cupos se liberan también si el análisis falla
        pass


def test_limitador_libera_el_cupo_si_el_trabajo_falla():
    limitador = LimitadorConcurrencia(maximo=1, maximo_por_clave=1)
    with pytest.raises(ValueError), limitador.reservar("ana"):
        raise ValueError("análisis fallido")
    assert limitador.en_curso == 0


def test_api_rechaza_analisis_simultaneos_del_mismo_usuario(cliente: TestClient, admin):
    usuario_id = cliente.get("/auth/sesion").json()["usuario"]["id"]
    cuerpo = {"transacciones": [{"monto": "100"}], "guardar": False}
    limitador = cliente.app.state.limitador_analisis
    with limitador.reservar(usuario_id):  # un análisis suyo en curso
        r = cliente.post("/analisis", json=cuerpo, headers=admin)
        assert r.status_code == 429
        assert "Ya tiene un análisis en curso" in r.json()["detail"]
    with limitador.reservar("otro-1"), limitador.reservar("otro-2"):  # servidor lleno (máximo 2)
        r = cliente.post("/analisis", json=cuerpo, headers=admin)
        assert r.status_code == 429
    assert cliente.post("/analisis", json=cuerpo, headers=admin).status_code == 201


# ------------------------------------------------------------------ Postgres de desarrollo y despliegue

RAIZ = Path(__file__).resolve().parents[2]


def test_postgres_de_desarrollo_solo_escucha_en_esta_maquina():
    compose = yaml.safe_load((RAIZ / "api-fraude-detection" / "docker-compose.yml").read_text())
    puertos = compose["services"]["postgres"]["ports"]
    assert puertos and all(p.startswith("127.0.0.1:") for p in puertos), puertos


def test_produccion_solo_publica_el_proxy():
    compose = yaml.safe_load((RAIZ / "despliegue-fraude" / "compose.yaml").read_text())
    servicios = compose["services"]
    assert "ports" in servicios["web"]
    assert "ports" not in servicios["api"] and "ports" not in servicios["postgres"]
    for nombre in ("web", "api", "postgres"):
        assert "mem_limit" in servicios[nombre] and "pids_limit" in servicios[nombre], nombre


# ------------------------------------------------------------------ análisis de otros usuarios


def test_analisis_ajeno_responde_igual_que_uno_inexistente(cliente: TestClient, admin):
    cuerpo = {"transacciones": [{"monto": str(m)} for m in montos_benford(50)], "descripcion": "del admin"}
    analisis_id = cliente.post("/analisis", json=cuerpo, headers=admin).json()["id"]
    analista, _ = crear_usuario_listo(cliente, admin, "analista1", "clave-analista-123")

    ajeno, inexistente = analista.get(f"/analisis/{analisis_id}"), analista.get("/analisis/999999")
    assert ajeno.status_code == inexistente.status_code == 404
    assert ajeno.json() == inexistente.json()
    assert cliente.get(f"/analisis/{analisis_id}").status_code == 200  # el admin sí lo ve


# ------------------------------------------------------------------ último administrador


def test_no_se_puede_dejar_el_sistema_sin_administradores(cliente: TestClient, admin):
    admin_id = cliente.get("/auth/sesion").json()["usuario"]["id"]
    for cambio in ({"activo": False}, {"rol": "analista"}):
        r = cliente.patch(f"/usuarios/{admin_id}", json=cambio, headers=admin)
        assert r.status_code == 409, r.text
        assert "al menos un administrador" in r.json()["detail"]

    otro, _ = crear_usuario_listo(cliente, admin, "admin2", "clave-admin2-segura", rol="admin")
    # Con otro administrador activo, sí puede ceder el rol.
    assert cliente.patch(f"/usuarios/{admin_id}", json={"rol": "analista"}, headers=admin).status_code == 200
    # Y ahora el nuevo es el último: tampoco se puede desactivar.
    admin2_id = otro.get("/auth/sesion").json()["usuario"]["id"]
    csrf2 = {"X-CSRF-Token": otro.cookies.get("csrf_token")}
    assert otro.patch(f"/usuarios/{admin2_id}", json={"activo": False}, headers=csrf2).status_code == 409


# ------------------------------------------------------------------ contraseña asignada


def test_contrasena_inicial_del_admin_debe_ser_robusta():
    with pytest.raises(ValidationError, match="12 caracteres"):
        Settings(admin_contrasena="corta")
    assert Settings(admin_contrasena="").admin_contrasena is None  # vacía = no crear administrador


def test_contrasena_asignada_obliga_a_cambiarla_en_el_primer_ingreso(settings: Settings):
    nueva = "otra-clave-muy-segura"
    with _cliente_con(settings) as cliente:  # admin recién creado desde la configuración
        r = _login(cliente, clave=ADMIN_CLAVE)
        assert r.status_code == 200 and r.json()["usuario"]["debe_cambiar_contrasena"] is True
        csrf = {"X-CSRF-Token": r.json()["csrf_token"]}

        r = cliente.get("/perfiles")
        assert r.status_code == 403 and "Debe cambiar su contraseña" in r.json()["detail"]
        assert (
            cliente.post("/analisis", json={"transacciones": [{"monto": "1"}]}, headers=csrf).status_code
            == 403
        )
        assert cliente.get("/auth/sesion").status_code == 200  # sí puede ver su sesión

        misma = {"contrasena_actual": ADMIN_CLAVE, "contrasena_nueva": ADMIN_CLAVE}
        assert cliente.post("/auth/cambiar-contrasena", json=misma, headers=csrf).status_code == 400
        cambio = {"contrasena_actual": ADMIN_CLAVE, "contrasena_nueva": nueva}
        assert cliente.post("/auth/cambiar-contrasena", json=cambio, headers=csrf).status_code == 204

        assert cliente.get("/auth/sesion").status_code == 401  # el cambio cierra la sesión
        assert _login(cliente, clave=ADMIN_CLAVE).status_code == 401  # la inicial ya no sirve
        r = _login(cliente, clave=nueva)
        assert r.status_code == 200 and r.json()["usuario"]["debe_cambiar_contrasena"] is False
        assert cliente.get("/perfiles").status_code == 200


def test_usuario_creado_por_un_admin_debe_cambiar_su_contrasena(cliente: TestClient, admin):
    cuerpo = {"nombre_usuario": "nuevo", "contrasena": "clave-asignada-123", "rol": "analista"}
    r = cliente.post("/usuarios", json=cuerpo, headers=admin)
    assert r.status_code == 201 and r.json()["debe_cambiar_contrasena"] is True


# ------------------------------------------------------------------ cambio de contraseña vs. login en curso


def test_cambio_de_contrasena_espera_al_login_en_curso(cliente: TestClient, admin, bd_limpia: Engine):
    """Un login que ya validó la contraseña vieja no debe dejar una sesión viva tras el cambio."""
    cambio = {"contrasena_actual": ADMIN_CLAVE, "contrasena_nueva": "otra-clave-muy-segura"}
    respuestas: list = []
    hilo = threading.Thread(
        target=lambda: respuestas.append(cliente.post("/auth/cambiar-contrasena", json=cambio, headers=admin))
    )
    token_atacante = "token-del-login-en-curso"

    with crear_fabrica_sesiones(bd_limpia)() as db, db.begin():
        # Un inicio de sesión con la contraseña vieja está en curso (ya la validó)...
        RepositorioIntentosAccesoSQL(db).reservar(ADMIN_USUARIO, "203.0.113.9")
        hilo.start()
        hilo.join(timeout=0.5)
        assert hilo.is_alive(), "el cambio de contraseña debe esperar al inicio de sesión en curso"
        # ...y termina creando su sesión.
        usuario_id = db.execute(text("SELECT id FROM usuarios WHERE nombre_usuario = 'admin'")).scalar_one()
        RepositorioSesionesSQL(db).crear(
            Sesion(
                usuario_id=usuario_id,
                hash_token=hashear_token(token_atacante),
                hash_csrf=hashear_token("csrf"),
                expira_en=datetime.now(UTC) + timedelta(hours=1),
            )
        )
    hilo.join(timeout=10)

    assert respuestas and respuestas[0].status_code == 204
    with bd_limpia.connect() as conexion:
        revocada = conexion.execute(
            text("SELECT revocada FROM sesiones WHERE hash_token = :h"), {"h": hashear_token(token_atacante)}
        ).scalar_one()
    assert revocada


# ------------------------------------------------------------------ subidas grandes simultáneas


def test_subidas_grandes_simultaneas_se_limitan():
    async def escenario() -> None:
        liberar, dentro = asyncio.Event(), asyncio.Event()

        async def app_lenta(scope, receive, send):
            dentro.set()
            await liberar.wait()
            await JSONResponse({"ok": True})(scope, receive, send)

        limite = LimiteCuerpo(app_lenta, 10 * MB, 10 * MB, max_cuerpos_grandes_simultaneos=1)

        def peticion(largo: int | None) -> dict:
            cabeceras = [(b"content-length", str(largo).encode())] if largo is not None else []
            if largo is None:
                cabeceras.append((b"transfer-encoding", b"chunked"))
            return {"type": "http", "method": "POST", "path": "/", "headers": cabeceras}

        async def recibir():
            return {"type": "http.request", "body": b"", "more_body": False}

        def capturar(destino: list):
            async def enviar(mensaje):
                if mensaje["type"] == "http.response.start":
                    destino.append(mensaje["status"])

            return enviar

        primera, segunda, por_partes, despues = [], [], [], []
        en_curso = asyncio.create_task(limite(peticion(2 * MB), recibir, capturar(primera)))
        await dentro.wait()
        await limite(peticion(2 * MB), recibir, capturar(segunda))
        await limite(peticion(None), recibir, capturar(por_partes))  # tamaño desconocido = grande
        assert segunda == [429] and por_partes == [429]

        liberar.set()
        await en_curso
        assert primera == [200] and limite.cuerpos_grandes_en_curso == 0
        await limite(peticion(2 * MB), recibir, capturar(despues))
        assert despues == [200]

    asyncio.run(escenario())


# ------------------------------------------------------------------ informativos


def test_produccion_no_instala_dependencias_innecesarias():
    proyecto = tomllib.loads((RAIZ / "api-fraude-detection" / "pyproject.toml").read_text())
    dependencias = proyecto["project"]["dependencies"]
    assert not any("[standard]" in d for d in dependencias), dependencias  # traía CLI, nube, jinja...
    assert not any(d.startswith(("httpx", "pytest")) for d in dependencias), dependencias
    assert any(d.startswith("httpx") for d in proyecto["dependency-groups"]["dev"])


@pytest.mark.parametrize(
    ("opciones", "sesion", "csrf"),
    [
        ({"cookie_segura": True}, "__Host-sid", "__Host-csrf_token"),
        ({"cookie_segura": False}, "sid", "csrf_token"),  # desarrollo sin HTTPS
        (
            {"cookie_segura": True, "cookie_dominio": "midominio.com"},
            "sid",
            "csrf_token",
        ),  # API en otro origen
    ],
)
def test_nombres_de_cookie_usan_prefijo_host_cuando_es_posible(opciones, sesion, csrf):
    config = Settings(**opciones)
    assert (config.cookie_sesion_nombre, config.cookie_csrf_nombre) == (sesion, csrf)


@pytest.mark.parametrize(
    "opciones",
    [
        {"cookie_sesion_nombre": "__Host-sid", "cookie_segura": False},
        {"cookie_sesion_nombre": "__Host-sid", "cookie_segura": True, "cookie_dominio": "midominio.com"},
        {"cookie_csrf_nombre": "__Secure-csrf", "cookie_segura": False},
    ],
)
def test_prefijos_de_cookie_incoherentes_se_rechazan(opciones):
    with pytest.raises(ValidationError):
        Settings(**opciones)


def test_login_por_https_emite_cookies_host(settings: Settings, bd_limpia: Engine):
    datos = settings.model_dump() | {
        "cookie_segura": True,
        "cookie_sesion_nombre": None,
        "cookie_csrf_nombre": None,
    }
    with TestClient(create_app(Settings(**datos)), base_url="https://testserver") as cliente:
        with bd_limpia.begin() as conexion:
            conexion.execute(text("UPDATE usuarios SET debe_cambiar_contrasena = false"))
        r = _login(cliente, clave=ADMIN_CLAVE)
        assert r.status_code == 200
        cookies = r.headers.get_list("set-cookie")
        for nombre in ("__Host-sid=", "__Host-csrf_token="):
            cookie = next(c for c in cookies if c.startswith(nombre))
            atributos = cookie.lower()
            assert "secure" in atributos and "path=/" in atributos and "domain=" not in atributos, cookie
        csrf = {"X-CSRF-Token": cliente.cookies.get("__Host-csrf_token")}
        assert cliente.get("/perfiles").status_code == 200
        assert cliente.post("/auth/logout", headers=csrf).status_code == 204


def test_iniciar_sesion_purga_las_sesiones_que_ya_no_sirven(cliente: TestClient, bd_limpia: Engine):
    ahora = datetime.now(UTC)
    with crear_fabrica_sesiones(bd_limpia)() as db, db.begin():
        usuario_id = db.execute(text("SELECT id FROM usuarios WHERE nombre_usuario = 'admin'")).scalar_one()
        repo = RepositorioSesionesSQL(db)
        casos = {
            "vencida": {"expira_en": ahora - timedelta(minutes=1)},
            "revocada": {"expira_en": ahora + timedelta(hours=1), "revocada": True},
            "inactiva": {
                "expira_en": ahora + timedelta(hours=1),
                "ultima_actividad": ahora - timedelta(days=1),
            },
            "vigente": {"expira_en": ahora + timedelta(hours=1), "ultima_actividad": ahora},
        }
        for nombre, campos in casos.items():
            repo.crear(
                Sesion(usuario_id=usuario_id, hash_token=hashear_token(nombre), hash_csrf="x" * 64, **campos)
            )

    assert _login(cliente, clave=ADMIN_CLAVE).status_code == 200

    with bd_limpia.connect() as conexion:
        restantes = set(conexion.execute(text("SELECT hash_token FROM sesiones")).scalars())
    assert hashear_token("vigente") in restantes
    for nombre in ("vencida", "revocada", "inactiva"):
        assert hashear_token(nombre) not in restantes, nombre
    assert len(restantes) == 2  # la vigente y la recién creada


def test_caddy_corre_sin_root_y_sin_capacidades():
    dockerfile = (RAIZ / "fraude-detection-front" / "Dockerfile").read_text()
    etapa_final = dockerfile.rsplit("\nFROM ", 1)[1]
    assert etapa_final.startswith("caddy:")
    assert "\nUSER caddy" in etapa_final
    # Sin root, un binario con capacidades de archivo no puede ejecutarse: hay que quitárselas.
    assert "setcap -r /usr/bin/caddy" in etapa_final
    # Validar crea archivos en /data: debe hacerse ya como `caddy`, o el servidor no podrá leerlos.
    assert etapa_final.index("\nUSER caddy") < etapa_final.index("caddy validate")

    caddyfile = (RAIZ / "fraude-detection-front" / "Caddyfile").read_text()
    assert "http_port 8080" in caddyfile and "https_port 8443" in caddyfile
    assert "redir https://{host}{uri}" in caddyfile  # sin el :8443 interno en la redirección

    web = yaml.safe_load((RAIZ / "despliegue-fraude" / "compose.yaml").read_text())["services"]["web"]
    assert web["user"] == "10001:10001"
    assert web["cap_drop"] == ["ALL"] and "cap_add" not in web
    assert all(p.split(":")[-1].split("/")[0] in {"8080", "8443"} for p in web["ports"]), web["ports"]


# ------------------------------------------------------------------ respaldos y cadena de suministro


def _compose_produccion() -> dict:
    return yaml.safe_load((RAIZ / "despliegue-fraude" / "compose.yaml").read_text())


def test_respaldos_cifrados_y_aislados():
    servicios = _compose_produccion()["services"]
    respaldos = servicios["respaldos"]
    assert "ports" not in respaldos and respaldos["networks"] == ["interna"]
    assert respaldos["read_only"] is True and respaldos["cap_drop"] == ["ALL"]
    assert "no-new-privileges:true" in respaldos["security_opt"]
    # La clave pública es obligatoria; la privada nunca está en el servidor.
    assert ":?" in respaldos["environment"]["RESPALDO_CLAVE_PUBLICA"]
    assert not any("PRIVADA" in variable for variable in respaldos["environment"])
    assert respaldos["depends_on"]["api"]["condition"] == "service_healthy"  # tras las migraciones
    assert "healthcheck" in respaldos

    dockerfile = (RAIZ / "despliegue-fraude" / "respaldos" / "Dockerfile").read_text()
    imagen = next(linea.split()[1] for linea in dockerfile.splitlines() if linea.startswith("FROM "))
    assert imagen == servicios["postgres"]["image"]  # pg_dump de la misma versión que el servidor
    assert "\nUSER postgres" in dockerfile

    respaldar = (RAIZ / "despliegue-fraude" / "respaldos" / "respaldar.sh").read_text()
    assert "set -o pipefail" in respaldar  # un pg_dump fallido no deja un respaldo "válido"
    assert 'age --encrypt --recipient "$RESPALDO_CLAVE_PUBLICA"' in respaldar
    assert ".parcial" in respaldar and "-mtime +" in respaldar  # escritura atómica y retención

    restaurar = (RAIZ / "despliegue-fraude" / "respaldos" / "restaurar.sh").read_text()
    # Comprueba la clave y la integridad antes de crear o tocar una base.
    assert restaurar.index("--output /dev/null") < restaurar.index('createdb "$base"')
    assert "--reemplazar" in restaurar and 'dropdb "$base"' in restaurar


def test_api_de_produccion_exige_claves_de_cifrado():
    entorno = _compose_produccion()["services"]["api"]["environment"]
    assert ":?" in entorno["FRAUDE_CLAVES_CIFRADO"]
    assert entorno["FRAUDE_ALERTAS_WEBHOOK_URL"].endswith(":-}")  # opcional


def test_doble_factor_de_admins_obligatorio_en_produccion():
    with pytest.raises(ValidationError, match="doble factor"):
        Settings(entorno="produccion", exigir_segundo_factor_admin=False)
    assert Settings(entorno="produccion", cookie_segura=True).exigir_segundo_factor_admin is True


def test_uv_no_instala_versiones_recien_publicadas():
    proyecto = tomllib.loads((RAIZ / "api-fraude-detection" / "pyproject.toml").read_text())
    assert proyecto["tool"]["uv"]["exclude-newer"] == "1 day"
    lock = (RAIZ / "api-fraude-detection" / "uv.lock").read_text()
    assert 'exclude-newer-span = "P1D"' in lock  # el lock respeta la regla (uv sync --locked)
    pnpm = yaml.safe_load((RAIZ / "fraude-detection-front" / "pnpm-workspace.yaml").read_text())
    assert pnpm["minimumReleaseAge"] >= 1440  # mismo criterio en el frontend
