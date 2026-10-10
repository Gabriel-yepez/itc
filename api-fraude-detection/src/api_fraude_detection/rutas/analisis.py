from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from ..contenedor import CtrlAnalisis, UsuarioActual
from ..controladores.analisis import FormularioCSV, SolicitudAnalisis, formulario_csv
from ..vistas.analisis import RespuestaAnalisis, ResumenAnalisis

router = APIRouter(prefix="/analisis", tags=["Análisis de Benford"])


@router.post("", response_model=RespuestaAnalisis, status_code=status.HTTP_201_CREATED)
def analizar(datos: SolicitudAnalisis, actual: UsuarioActual, ctrl: CtrlAnalisis):
    """Ejecuta las pruebas de Benford y las señales complementarias sobre las transacciones
    enviadas, con los parámetros del perfil indicado (o el predeterminado) y sus sobrescrituras."""
    return ctrl.analizar(datos, actual)


@router.post("/csv", response_model=RespuestaAnalisis, status_code=status.HTTP_201_CREATED)
def analizar_csv(
    actual: UsuarioActual,
    ctrl: CtrlAnalisis,
    archivo: Annotated[UploadFile, File(description="Extracto en CSV")],
    formulario: Annotated[FormularioCSV, Depends(formulario_csv)],
):
    return ctrl.analizar_csv(archivo, formulario, actual)


@router.get("", response_model=list[ResumenAnalisis])
def listar_analisis(
    actual: UsuarioActual,
    ctrl: CtrlAnalisis,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
    desplazamiento: Annotated[int, Query(ge=0)] = 0,
):
    """Historial: los analistas ven sus propios análisis; los administradores, todos."""
    return ctrl.listar(actual, limite, desplazamiento)


@router.get("/{analisis_id}", response_model=RespuestaAnalisis)
def obtener_analisis(analisis_id: int, actual: UsuarioActual, ctrl: CtrlAnalisis):
    return ctrl.obtener(analisis_id, actual)
