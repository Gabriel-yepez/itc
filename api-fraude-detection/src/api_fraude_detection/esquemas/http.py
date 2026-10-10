from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from ..dominio.entidades import PerfilDeteccion, RegistroAnalisis, Rol, Usuario
from ..dominio.parametros import NivelRiesgo, ParametrosDeteccion
from ..dominio.resultados import ResultadoAnalisis
from ..dominio.transacciones import Transaccion

_NOMBRE_USUARIO = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.\-]+$")
# Mínimo 12 caracteres (NIST SP 800-63B); el límite superior evita abusar del hash.
_CONTRASENA = Field(min_length=12, max_length=128)


class _Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ------------------------------------------------------------------ autenticación


class SolicitudLogin(_Entrada):
    usuario: str = Field(min_length=1, max_length=64)
    contrasena: str = Field(min_length=1, max_length=128)


class UsuarioPublico(BaseModel):
    id: int
    nombre_usuario: str
    rol: Rol
    activo: bool
    creado_en: datetime

    @classmethod
    def desde(cls, usuario: Usuario) -> UsuarioPublico:
        return cls(
            id=usuario.id,
            nombre_usuario=usuario.nombre_usuario,
            rol=usuario.rol,
            activo=usuario.activo,
            creado_en=usuario.creado_en,
        )


class RespuestaSesion(BaseModel):
    usuario: UsuarioPublico
    expira_en: datetime
    csrf_token: str | None = Field(
        default=None, description="Enviar en la cabecera X-CSRF-Token en peticiones que modifican datos"
    )


class SolicitudCambioContrasena(_Entrada):
    contrasena_actual: str = Field(min_length=1, max_length=128)
    contrasena_nueva: str = _CONTRASENA


class SolicitudCrearUsuario(_Entrada):
    nombre_usuario: str = _NOMBRE_USUARIO
    contrasena: str = _CONTRASENA
    rol: Rol = Rol.ANALISTA


class SolicitudActualizarUsuario(_Entrada):
    rol: Rol | None = None
    activo: bool | None = None


# ------------------------------------------------------------------ perfiles


class PerfilPublico(BaseModel):
    id: int
    nombre: str
    descripcion: str
    predeterminado: bool
    parametros: ParametrosDeteccion
    creado_en: datetime
    actualizado_en: datetime

    @classmethod
    def desde(cls, perfil: PerfilDeteccion) -> PerfilPublico:
        return cls(
            id=perfil.id,
            nombre=perfil.nombre,
            descripcion=perfil.descripcion,
            predeterminado=perfil.predeterminado,
            parametros=perfil.parametros,
            creado_en=perfil.creado_en,
            actualizado_en=perfil.actualizado_en,
        )


class SolicitudCrearPerfil(_Entrada):
    nombre: str = Field(min_length=1, max_length=120)
    descripcion: str = Field(default="", max_length=2000)
    predeterminado: bool = False
    parametros: ParametrosDeteccion = Field(default_factory=ParametrosDeteccion)


class SolicitudActualizarPerfil(_Entrada):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    descripcion: str | None = Field(default=None, max_length=2000)
    predeterminado: bool | None = None
    parametros: dict[str, Any] | None = Field(
        default=None, description="Cambios parciales sobre los parámetros actuales del perfil"
    )


# ------------------------------------------------------------------ análisis


class SolicitudAnalisis(_Entrada):
    transacciones: list[Transaccion] = Field(min_length=1)
    perfil_id: int | None = Field(
        default=None, description="Perfil a usar; si se omite se usa el perfil predeterminado"
    )
    parametros: dict[str, Any] | None = Field(
        default=None, description="Sobrescrituras puntuales de los parámetros del perfil"
    )
    descripcion: str = Field(default="", max_length=255)
    guardar: bool = True


class RespuestaAnalisis(BaseModel):
    id: int | None
    perfil_id: int | None
    descripcion: str
    creado_en: datetime
    parametros: dict[str, Any]
    resultado: ResultadoAnalisis

    @classmethod
    def desde(cls, registro: RegistroAnalisis) -> RespuestaAnalisis:
        return cls(
            id=registro.id,
            perfil_id=registro.perfil_id,
            descripcion=registro.descripcion,
            creado_en=registro.creado_en,
            parametros=registro.parametros,
            resultado=ResultadoAnalisis.model_validate(registro.resultado),
        )


class ResumenAnalisis(BaseModel):
    id: int
    usuario_id: int
    perfil_id: int | None
    descripcion: str
    puntaje: float
    nivel_riesgo: NivelRiesgo
    total_transacciones: int
    creado_en: datetime

    @classmethod
    def desde(cls, registro: RegistroAnalisis) -> ResumenAnalisis:
        return cls(
            id=registro.id,
            usuario_id=registro.usuario_id,
            perfil_id=registro.perfil_id,
            descripcion=registro.descripcion,
            puntaje=registro.puntaje,
            nivel_riesgo=registro.nivel_riesgo,
            total_transacciones=registro.total_transacciones,
            creado_en=registro.creado_en,
        )
