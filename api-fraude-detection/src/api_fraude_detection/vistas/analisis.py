from datetime import datetime
from typing import Any

from pydantic import BaseModel

from ..modelos.dominio.entidades import RegistroAnalisis
from ..modelos.dominio.parametros import NivelRiesgo
from ..modelos.dominio.resultados import ResultadoAnalisis


class RespuestaAnalisis(BaseModel):
    id: int | None
    perfil_id: int | None
    descripcion: str
    creado_en: datetime
    parametros: dict[str, Any]
    resultado: ResultadoAnalisis


class ResumenAnalisis(BaseModel):
    id: int
    usuario_id: int
    perfil_id: int | None
    descripcion: str
    puntaje: float
    nivel_riesgo: NivelRiesgo
    total_transacciones: int
    creado_en: datetime


class VistaAnalisis:
    def detalle(self, registro: RegistroAnalisis) -> RespuestaAnalisis:
        return RespuestaAnalisis(
            id=registro.id,
            perfil_id=registro.perfil_id,
            descripcion=registro.descripcion,
            creado_en=registro.creado_en,
            parametros=registro.parametros,
            resultado=ResultadoAnalisis.model_validate(registro.resultado),
        )

    def resumen(self, registro: RegistroAnalisis) -> ResumenAnalisis:
        return ResumenAnalisis(
            id=registro.id,
            usuario_id=registro.usuario_id,
            perfil_id=registro.perfil_id,
            descripcion=registro.descripcion,
            puntaje=registro.puntaje,
            nivel_riesgo=registro.nivel_riesgo,
            total_transacciones=registro.total_transacciones,
            creado_en=registro.creado_en,
        )

    def lista(self, registros: list[RegistroAnalisis]) -> list[ResumenAnalisis]:
        return [self.resumen(r) for r in registros]
