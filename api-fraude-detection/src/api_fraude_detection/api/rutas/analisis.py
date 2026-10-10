import json
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, Query, UploadFile, status

from ...core.errores import DatosInsuficientes
from ...esquemas.http import RespuestaAnalisis, ResumenAnalisis, SolicitudAnalisis
from ...servicios.importacion_csv import FormatoCSV, leer_transacciones_csv
from ..dependencias import Config, ServAnalisis, UsuarioActual

router = APIRouter(prefix="/analisis", tags=["Análisis de Benford"])

_TAMANO_BLOQUE = 1024 * 1024


@router.post("", response_model=RespuestaAnalisis, status_code=status.HTTP_201_CREATED)
def analizar(datos: SolicitudAnalisis, actual: UsuarioActual, servicio: ServAnalisis) -> RespuestaAnalisis:
    """Ejecuta las pruebas de Benford y las señales complementarias sobre las transacciones
    enviadas, con los parámetros del perfil indicado (o el predeterminado) y sus sobrescrituras."""
    registro = servicio.analizar(
        datos.transacciones,
        actual,
        perfil_id=datos.perfil_id,
        sobrescrituras=datos.parametros,
        descripcion=datos.descripcion,
        guardar=datos.guardar,
    )
    return RespuestaAnalisis.desde(registro)


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


@router.post("/csv", response_model=RespuestaAnalisis, status_code=status.HTTP_201_CREATED)
def analizar_csv(
    actual: UsuarioActual,
    servicio: ServAnalisis,
    config: Config,
    archivo: Annotated[UploadFile, File(description="Extracto en CSV")],
    perfil_id: Annotated[int | None, Form()] = None,
    parametros: Annotated[str | None, Form(description="JSON con sobrescrituras de parámetros")] = None,
    formato: Annotated[
        str | None,
        Form(description='Formato del CSV en JSON, p. ej. {"separador_decimal": ",", "delimitador": ";"}'),
    ] = None,
    descripcion: Annotated[str, Form(max_length=255)] = "",
    guardar: Annotated[bool, Form()] = True,
) -> RespuestaAnalisis:
    limite = config.max_tamano_csv_mb * 1024 * 1024
    contenido = bytearray()
    # Ruta síncrona a propósito: FastAPI la ejecuta en un hilo y no bloquea el event loop.
    while bloque := archivo.file.read(_TAMANO_BLOQUE):
        contenido.extend(bloque)
        if len(contenido) > limite:
            raise DatosInsuficientes(f"El archivo supera {config.max_tamano_csv_mb} MB")

    formato_csv = FormatoCSV.model_validate(_json_opcional(formato, "formato") or {})
    transacciones, omitidas = leer_transacciones_csv(bytes(contenido), formato_csv, config.max_transacciones)

    registro = servicio.analizar(
        transacciones,
        actual,
        perfil_id=perfil_id,
        sobrescrituras=_json_opcional(parametros, "parametros"),
        descripcion=descripcion or (archivo.filename or "")[:255],
        guardar=guardar,
        advertencias_extra=[f"Se omitieron {omitidas} filas inválidas del CSV."] if omitidas else None,
    )
    return RespuestaAnalisis.desde(registro)


@router.get("", response_model=list[ResumenAnalisis])
def listar_analisis(
    actual: UsuarioActual,
    servicio: ServAnalisis,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
) -> list[ResumenAnalisis]:
    """Historial: los analistas ven sus propios análisis; los administradores, todos."""
    return [ResumenAnalisis.desde(r) for r in servicio.listar(actual, limite, desplazamiento)]


@router.get("/{analisis_id}", response_model=RespuestaAnalisis)
def obtener_analisis(analisis_id: int, actual: UsuarioActual, servicio: ServAnalisis) -> RespuestaAnalisis:
    return RespuestaAnalisis.desde(servicio.obtener(analisis_id, actual))
