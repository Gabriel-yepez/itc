from typing import Any

from pydantic import Field

from ..modelos.dominio.parametros import ParametrosDeteccion
from ..modelos.servicios.autenticacion import UsuarioAutenticado
from ..modelos.servicios.perfiles import ServicioPerfiles, parametros_referencia_venezuela
from ..vistas.perfiles import PerfilPublico, VistaPerfiles
from .base import Solicitud


class SolicitudCrearPerfil(Solicitud):
    nombre: str = Field(min_length=1, max_length=120)
    descripcion: str = Field(default="", max_length=2000)
    predeterminado: bool = False
    parametros: ParametrosDeteccion = Field(default_factory=ParametrosDeteccion)


class SolicitudActualizarPerfil(Solicitud):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    descripcion: str | None = Field(default=None, max_length=2000)
    predeterminado: bool | None = None
    parametros: dict[str, Any] | None = Field(
        default=None, description="Cambios parciales sobre los parámetros actuales del perfil"
    )


class ControladorPerfiles:
    def __init__(self, servicio: ServicioPerfiles, vista: VistaPerfiles):
        self._servicio = servicio
        self._vista = vista

    def listar(self) -> list[PerfilPublico]:
        return self._vista.lista(self._servicio.listar())

    def obtener(self, perfil_id: int) -> PerfilPublico:
        return self._vista.detalle(self._servicio.obtener(perfil_id))

    def parametros_referencia(self) -> ParametrosDeteccion:
        return parametros_referencia_venezuela()

    def esquema_parametros(self) -> dict:
        return self._vista.esquema_parametros()

    def crear(self, solicitud: SolicitudCrearPerfil, admin: UsuarioAutenticado) -> PerfilPublico:
        perfil = self._servicio.crear(
            solicitud.nombre,
            solicitud.parametros,
            solicitud.descripcion,
            solicitud.predeterminado,
            admin.usuario.id,
        )
        return self._vista.detalle(perfil)

    def actualizar(self, perfil_id: int, solicitud: SolicitudActualizarPerfil) -> PerfilPublico:
        perfil = self._servicio.actualizar(
            perfil_id,
            nombre=solicitud.nombre,
            descripcion=solicitud.descripcion,
            predeterminado=solicitud.predeterminado,
            cambios_parametros=solicitud.parametros,
        )
        return self._vista.detalle(perfil)

    def eliminar(self, perfil_id: int) -> None:
        self._servicio.eliminar(perfil_id)
