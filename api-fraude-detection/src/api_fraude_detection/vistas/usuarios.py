from datetime import datetime

from pydantic import BaseModel

from ..modelos.dominio.entidades import Rol, Usuario


class UsuarioPublico(BaseModel):
    """Representación pública: nunca expone el hash de contraseña, el secreto TOTP ni los códigos."""

    id: int
    nombre_usuario: str
    rol: Rol
    activo: bool
    debe_cambiar_contrasena: bool
    segundo_factor_activo: bool
    debe_configurar_segundo_factor: bool
    creado_en: datetime


class VistaUsuarios:
    def __init__(self, exigir_segundo_factor_admin: bool = True):
        self._exigir_segundo_factor_admin = exigir_segundo_factor_admin

    def detalle(self, usuario: Usuario) -> UsuarioPublico:
        return UsuarioPublico(
            id=usuario.id,
            nombre_usuario=usuario.nombre_usuario,
            rol=usuario.rol,
            activo=usuario.activo,
            debe_cambiar_contrasena=usuario.debe_cambiar_contrasena,
            segundo_factor_activo=usuario.totp_activo,
            debe_configurar_segundo_factor=usuario.debe_configurar_segundo_factor(
                self._exigir_segundo_factor_admin
            ),
            creado_en=usuario.creado_en,
        )

    def lista(self, usuarios: list[Usuario]) -> list[UsuarioPublico]:
        return [self.detalle(u) for u in usuarios]
