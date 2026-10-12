import json
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Form, UploadFile
from pydantic import Field

from ..core.errores import DatosInsuficientes
from ..core.limites import LimitadorConcurrencia
from ..modelos.dominio.transacciones import Transaccion
from ..modelos.servicios.analisis import ServicioAnalisis
from ..modelos.servicios.autenticacion import UsuarioAutenticado
from ..modelos.servicios.importacion_csv import FormatoCSV, leer_transacciones_csv
from ..vistas.analisis import RespuestaAnalisis, ResumenAnalisis, VistaAnalisis
from .base import Solicitud

_TAMANO_BLOQUE = 1024 * 1024


class SolicitudAnalisis(Solicitud):
    transacciones: list[Transaccion] = Field(min_length=1)
    perfil_id: int | None = Field(
        default=None, description="Perfil a usar; si se omite se usa el perfil predeterminado"
    )
    parametros: dict[str, Any] | None = Field(
        default=None, description="Sobrescrituras puntuales de los parámetros del perfil"
    )
    descripcion: str = Field(default="", max_length=255)
    guardar: bool = True


@dataclass(frozen=True, slots=True)
class FormularioCSV:
    perfil_id: int | None
    parametros: str | None
    formato: str | None
    descripcion: str
    guardar: bool


def formulario_csv(
    perfil_id: Annotated[int | None, Form()] = None,
    parametros: Annotated[str | None, Form(description="JSON con sobrescrituras de parámetros")] = None,
    formato: Annotated[
        str | None,
        Form(description='Formato del CSV en JSON, p. ej. {"separador_decimal": ",", "delimitador": ";"}'),
    ] = None,
    descripcion: Annotated[str, Form(max_length=255)] = "",
    guardar: Annotated[bool, Form()] = True,
) -> FormularioCSV:
    """Agrupa los campos multipart del análisis por CSV (se usa con Depends)."""
    return FormularioCSV(perfil_id, parametros, formato, descripcion, guardar)


def _json_opcional(texto: str | None, campo: str) -> dict[str, Any] | None:
    if not texto:
        return None
    try:
        valor = json.loads(texto)
    except json.JSONDecodeError as error:
        raise DatosInsuficientes(f"'{campo}' no es JSON válido") from error
    if not isinstance(valor, dict):
        raise DatosInsuficientes(f"'{campo}' debe ser un objeto JSON")
    return valor


class ControladorAnalisis:
    def __init__(
        self,
        servicio: ServicioAnalisis,
        vista: VistaAnalisis,
        limitador: LimitadorConcurrencia,
        max_tamano_csv_mb: int,
        max_transacciones: int,
    ):
        self._servicio = servicio
        self._vista = vista
        self._limitador = limitador
        self._max_bytes_csv = max_tamano_csv_mb * 1024 * 1024
        self._max_transacciones = max_transacciones

    def analizar(self, solicitud: SolicitudAnalisis, actual: UsuarioAutenticado) -> RespuestaAnalisis:
        with self._limitador.reservar(actual.usuario.id):
            registro = self._servicio.analizar(
                solicitud.transacciones,
                actual,
                perfil_id=solicitud.perfil_id,
                sobrescrituras=solicitud.parametros,
                descripcion=solicitud.descripcion,
                guardar=solicitud.guardar,
            )
        return self._vista.detalle(registro)

    def analizar_csv(
        self, archivo: UploadFile, formulario: FormularioCSV, actual: UsuarioAutenticado
    ) -> RespuestaAnalisis:
        # Leer y convertir el CSV también es trabajo pesado: entra en el cupo.
        with self._limitador.reservar(actual.usuario.id):
            contenido = self._leer_archivo(archivo)
            formato = FormatoCSV.model_validate(_json_opcional(formulario.formato, "formato") or {})
            transacciones, omitidas = leer_transacciones_csv(contenido, formato, self._max_transacciones)
            del contenido
            advertencias = [f"Se omitieron {omitidas} filas inválidas del CSV."] if omitidas else None
            registro = self._servicio.analizar(
                transacciones,
                actual,
                perfil_id=formulario.perfil_id,
                sobrescrituras=_json_opcional(formulario.parametros, "parametros"),
                descripcion=formulario.descripcion or (archivo.filename or "")[:255],
                guardar=formulario.guardar,
                advertencias_extra=advertencias,
            )
        return self._vista.detalle(registro)

    def listar(self, actual: UsuarioAutenticado, limite: int, desplazamiento: int) -> list[ResumenAnalisis]:
        return self._vista.lista(self._servicio.listar(actual, limite, desplazamiento))

    def obtener(self, analisis_id: int, actual: UsuarioAutenticado) -> RespuestaAnalisis:
        return self._vista.detalle(self._servicio.obtener(analisis_id, actual))

    def _leer_archivo(self, archivo: UploadFile) -> bytes:
        # Lectura síncrona por bloques: la ruta es `def`, FastAPI la ejecuta en un hilo.
        contenido = bytearray()
        while bloque := archivo.file.read(_TAMANO_BLOQUE):
            contenido.extend(bloque)
            if len(contenido) > self._max_bytes_csv:
                raise DatosInsuficientes(f"El archivo supera {self._max_bytes_csv // (1024 * 1024)} MB")
        return bytes(contenido)
