from fastapi.testclient import TestClient

from api_fraude_detection.contenedor import detector_fraude
from api_fraude_detection.modelos.dominio.parametros import NivelRiesgo
from api_fraude_detection.modelos.dominio.resultados import ResultadoAnalisis

from .conftest import ADMIN_CLAVE, crear_usuario_listo, montos_benford, montos_inventados


def _payload(montos, **extra) -> dict:
    return {"transacciones": [{"monto": str(m)} for m in montos], **extra}


# ------------------------------------------------------------------ sesión por cookies


def test_login_emite_cookies_seguras(cliente: TestClient):
    respuesta = cliente.post("/auth/login", json={"usuario": "admin", "contrasena": ADMIN_CLAVE})
    assert respuesta.status_code == 200
    cookies = respuesta.headers.get_list("set-cookie")
    sid = next(c for c in cookies if c.startswith("sid="))
    csrf = next(c for c in cookies if c.startswith("csrf_token="))
    assert "HttpOnly" in sid and "SameSite=strict" in sid
    assert "HttpOnly" not in csrf
    assert respuesta.json()["usuario"]["rol"] == "admin"


def test_rutas_protegidas_sin_sesion(cliente: TestClient):
    assert cliente.get("/perfiles").status_code == 401
    assert cliente.post("/analisis", json=_payload(["10"])).status_code == 401


def test_credenciales_invalidas_y_bloqueo(cliente: TestClient):
    for _ in range(3):  # max_intentos_fallidos=3 en las pruebas
        r = cliente.post("/auth/login", json={"usuario": "admin", "contrasena": "incorrecta"})
        assert r.status_code == 401
    r = cliente.post("/auth/login", json={"usuario": "admin", "contrasena": ADMIN_CLAVE})
    assert r.status_code == 429


def test_csrf_obligatorio_en_metodos_que_modifican(cliente: TestClient, admin):
    assert cliente.get("/auth/sesion").status_code == 200
    assert cliente.post("/analisis", json=_payload(["10"])).status_code == 403
    r = cliente.post("/analisis", json=_payload(["10"]), headers={"X-CSRF-Token": "falso"})
    assert r.status_code == 403
    assert cliente.post("/analisis", json=_payload(["10"]), headers=admin).status_code == 201


def test_logout_revoca_la_sesion(cliente: TestClient, admin):
    sid = cliente.cookies.get("sid")
    assert cliente.post("/auth/logout", headers=admin).status_code == 204
    cliente.cookies.set("sid", sid)  # reutilizar la cookie robada/antigua no sirve
    assert cliente.get("/auth/sesion").status_code == 401


def test_roles_analista_no_gestiona_perfiles(cliente: TestClient, admin):
    analista, csrf = crear_usuario_listo(cliente, admin, "analista1", "clave-analista-123")
    assert analista.get("/perfiles").status_code == 200
    r = analista.post("/perfiles", json={"nombre": "x"}, headers=csrf)
    assert r.status_code == 403


# ------------------------------------------------------------------ perfiles y análisis


def test_perfil_de_referencia_creado_al_iniciar(cliente: TestClient, admin):
    perfiles = cliente.get("/perfiles").json()
    assert len(perfiles) == 1 and perfiles[0]["predeterminado"]
    assert perfiles[0]["parametros"]["moneda_base"] == "VES"


def test_analisis_con_perfil_y_sobrescrituras(cliente: TestClient, admin):
    r = cliente.post(
        "/perfiles",
        json={
            "nombre": "Pago Móvil estricto",
            "parametros": {"canales": ["pago_movil"], "tamano_muestra_minimo": 100, "z_critico": 2.57},
        },
        headers=admin,
    )
    assert r.status_code == 201, r.text
    perfil_id = r.json()["id"]

    txs = [{"monto": str(m), "canal": "pago_movil"} for m in montos_inventados(500)]
    txs += [{"monto": "150", "canal": "transferencia"}]
    r = cliente.post(
        "/analisis",
        json={"transacciones": txs, "perfil_id": perfil_id, "parametros": {"alfa": 0.01}},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["parametros"]["alfa"] == 0.01
    assert cuerpo["parametros"]["z_critico"] == 2.57
    assert cuerpo["resultado"]["excluidas"] == {"canal_no_seleccionado": 1}
    assert cuerpo["resultado"]["nivel_riesgo"] in ("alto", "critico")

    historial = cliente.get("/analisis").json()
    assert historial[0]["id"] == cuerpo["id"]
    assert cliente.get(f"/analisis/{cuerpo['id']}").status_code == 200


def test_sobrescritura_invalida_devuelve_422(cliente: TestClient, admin):
    r = cliente.post("/analisis", json=_payload(["10"], parametros={"z_critico": -1}), headers=admin)
    assert r.status_code == 422


def test_analisis_desde_csv_formato_venezolano(cliente: TestClient, admin):
    filas = ["Fecha;Monto;Canal;Cuenta"]
    for i, m in enumerate(montos_benford(400)):
        entero, decimales = f"{m:.2f}".split(".")
        filas.append(f"15/03/2024;{int(entero):,}".replace(",", ".") + f",{decimales};Pago Móvil;c{i % 3}")
    csv = "\n".join(filas).encode()
    r = cliente.post(
        "/analisis/csv",
        files={"archivo": ("extracto.csv", csv, "text/csv")},
        data={"parametros": '{"agrupar_por": "cuenta", "tamano_muestra_minimo": 100}'},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    resultado = r.json()["resultado"]
    assert resultado["total_analizadas"] == 400
    assert len(resultado["grupos"]) == 3
    assert r.json()["descripcion"] == "extracto.csv"


def test_detector_inyectable(cliente: TestClient, admin):
    """La arquitectura permite sustituir el motor de detección sin tocar rutas ni servicios."""

    class DetectorFalso:
        def analizar(self, transacciones, parametros):
            return ResultadoAnalisis(
                moneda_base=parametros.moneda_base,
                total_recibidas=len(transacciones),
                total_analizadas=0,
                excluidas={},
                monto_minimo_observado=None,
                monto_maximo_observado=None,
                ordenes_de_magnitud=None,
                pruebas=[],
                umbrales=[],
                redondeo=None,
                grupos=[],
                grupos_omitidos_por_tamano=0,
                puntaje=99,
                nivel_riesgo=NivelRiesgo.CRITICO,
                hallazgos=["falso"],
                advertencias=[],
            )

    cliente.app.dependency_overrides[detector_fraude] = DetectorFalso
    r = cliente.post("/analisis", json=_payload(["10"]), headers=admin)
    cliente.app.dependency_overrides.clear()
    assert r.json()["resultado"]["hallazgos"] == ["falso"]
