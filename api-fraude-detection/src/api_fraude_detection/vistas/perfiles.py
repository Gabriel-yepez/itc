from datetime import datetime

from pydantic import BaseModel

from ..modelos.dominio.entidades import PerfilDeteccion
from ..modelos.dominio.parametros import ParametrosDeteccion


class PerfilPublico(BaseModel):
    id: int
    nombre: str
    descripcion: str
    predeterminado: bool
    parametros: ParametrosDeteccion
    creado_en: datetime
    actualizado_en: datetime


class VistaPerfiles:
    def detalle(self, perfil: PerfilDeteccion) -> PerfilPublico:
        return PerfilPublico(
            id=perfil.id,
            nombre=perfil.nombre,
            descripcion=perfil.descripcion,
            predeterminado=perfil.predeterminado,
            parametros=perfil.parametros,
            creado_en=perfil.creado_en,
            actualizado_en=perfil.actualizado_en,
        )

    def lista(self, perfiles: list[PerfilDeteccion]) -> list[PerfilPublico]:
        return [self.detalle(p) for p in perfiles]

    def esquema_parametros(self) -> dict:
        """JSON Schema (descripciones, rangos, valores por defecto) para generar formularios."""
        return ParametrosDeteccion.model_json_schema()
