from pydantic import Field

from ..modelos.dominio.entidades import Rol
from ..modelos.servicios.autenticacion import ServicioAutenticacion, UsuarioAutenticado
from ..vistas.usuarios import UsuarioPublico, VistaUsuarios
from .base import Solicitud

NOMBRE_USUARIO = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.\-]+$")
# Mínimo 12 caracteres (NIST SP 800-63B); el límite superior evita abusar del hash.
CONTRASENA = Field(min_length=12, max_length=128)


class SolicitudCrearUsuario(Solicitud):
    nombre_usuario: str = NOMBRE_USUARIO
    contrasena: str = CONTRASENA
    rol: Rol = Rol.ANALISTA


class SolicitudActualizarUsuario(Solicitud):
    rol: Rol | None = None
    activo: bool | None = None


class ControladorUsuarios:
    def __init__(self, servicio: ServicioAutenticacion, vista: VistaUsuarios):
        self._servicio = servicio
        self._vista = vista

    def listar(self) -> list[UsuarioPublico]:
        return self._vista.lista(self._servicio.listar_usuarios())

    def crear(self, solicitud: SolicitudCrearUsuario) -> UsuarioPublico:
        usuario = self._servicio.crear_usuario(solicitud.nombre_usuario, solicitud.contrasena, solicitud.rol)
        return self._vista.detalle(usuario)

    def restablecer_segundo_factor(self, usuario_id: int, admin: UsuarioAutenticado) -> UsuarioPublico:
        return self._vista.detalle(self._servicio.restablecer_segundo_factor(usuario_id, admin.usuario))

    def actualizar(self, usuario_id: int, solicitud: SolicitudActualizarUsuario) -> UsuarioPublico:
        usuario = self._servicio.actualizar_usuario(usuario_id, solicitud.rol, solicitud.activo)
        return self._vista.detalle(usuario)
