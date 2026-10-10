"""Cada capa MVC se prueba aislada gracias a los repositorios y la inyección de dependencias."""

import pytest

from api_fraude_detection.controladores.perfiles import ControladorPerfiles, SolicitudCrearPerfil
from api_fraude_detection.core.errores import Conflicto
from api_fraude_detection.modelos.dominio.entidades import PerfilDeteccion, Rol, Sesion, Usuario, ahora
from api_fraude_detection.modelos.repositorios.interfaces import RepositorioPerfiles
from api_fraude_detection.modelos.servicios.autenticacion import UsuarioAutenticado
from api_fraude_detection.modelos.servicios.perfiles import ServicioPerfiles
from api_fraude_detection.vistas.perfiles import VistaPerfiles
from api_fraude_detection.vistas.usuarios import VistaUsuarios


class RepositorioPerfilesMemoria(RepositorioPerfiles):
    """Implementación alternativa del contrato: sin base de datos."""

    def __init__(self):
        self._datos: dict[int, PerfilDeteccion] = {}

    def obtener_por_id(self, perfil_id):
        return self._datos.get(perfil_id)

    def obtener_por_nombre(self, nombre):
        return next((p for p in self._datos.values() if p.nombre == nombre), None)

    def obtener_predeterminado(self):
        return next((p for p in self._datos.values() if p.predeterminado), None)

    def listar(self):
        return list(self._datos.values())

    def guardar(self, perfil):
        perfil.id = perfil.id or len(self._datos) + 1
        self._datos[perfil.id] = perfil
        return perfil

    def eliminar(self, perfil_id):
        self._datos.pop(perfil_id, None)

    def quitar_predeterminado(self, excepto_id=None):
        for p in self._datos.values():
            if p.id != excepto_id:
                p.predeterminado = False


def _admin() -> UsuarioAutenticado:
    usuario = Usuario(nombre_usuario="admin", hash_contrasena="x", rol=Rol.ADMIN, id=1)
    return UsuarioAutenticado(usuario, Sesion(usuario_id=1, hash_token="t", hash_csrf="c", expira_en=ahora()))


def test_controlador_con_repositorio_en_memoria():
    ctrl = ControladorPerfiles(ServicioPerfiles(RepositorioPerfilesMemoria()), VistaPerfiles())

    primero = ctrl.crear(SolicitudCrearPerfil(nombre="A", predeterminado=True), _admin())
    segundo = ctrl.crear(SolicitudCrearPerfil(nombre="B", predeterminado=True), _admin())

    assert [p.nombre for p in ctrl.listar()] == ["A", "B"]
    assert ctrl.obtener(segundo.id).predeterminado
    assert not ctrl.obtener(primero.id).predeterminado  # solo un predeterminado a la vez
    with pytest.raises(Conflicto):
        ctrl.crear(SolicitudCrearPerfil(nombre="A"), _admin())


def test_vista_no_expone_datos_sensibles():
    usuario = Usuario(nombre_usuario="ana", hash_contrasena="$argon2id$secreto", intentos_fallidos=2, id=5)
    publico = VistaUsuarios().detalle(usuario).model_dump()
    assert "hash_contrasena" not in publico and "intentos_fallidos" not in publico
    assert publico["nombre_usuario"] == "ana"
