from datetime import datetime

from pydantic import BaseModel

from ..modelos.dominio.entidades import Rol, Usuario


class UsuarioPublico(BaseModel):
    """Representación pública: nunca expone el hash de contraseña ni el estado de bloqueo."""

    id: int
    nombre_usuario: str
    rol: Rol
    activo: bool
    creado_en: datetime


class VistaUsuarios:
    def detalle(self, usuario: Usuario) -> UsuarioPublico:
        return UsuarioPublico(
            id=usuario.id,
            nombre_usuario=usuario.nombre_usuario,
            rol=usuario.rol,
            activo=usuario.activo,
            creado_en=usuario.creado_en,
        )

    def lista(self, usuarios: list[Usuario]) -> list[UsuarioPublico]:
        return [self.detalle(u) for u in usuarios]
