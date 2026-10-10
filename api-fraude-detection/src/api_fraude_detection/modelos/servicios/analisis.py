from collections.abc import Callable, Sequence
from datetime import datetime

from ...core.errores import DatosInsuficientes, NoEncontrado, PermisoDenegado
from ..dominio.detector import DetectorFraude
from ..dominio.entidades import RegistroAnalisis, ahora
from ..dominio.transacciones import Transaccion
from ..repositorios.interfaces import RepositorioAnalisis
from .autenticacion import UsuarioAutenticado
from .perfiles import ServicioPerfiles


class ServicioAnalisis:
    def __init__(
        self,
        detector: DetectorFraude,
        perfiles: ServicioPerfiles,
        analisis: RepositorioAnalisis,
        max_transacciones: int,
        reloj: Callable[[], datetime] = ahora,
    ):
        self._detector = detector
        self._perfiles = perfiles
        self._analisis = analisis
        self._max_transacciones = max_transacciones
        self._reloj = reloj

    def analizar(
        self,
        transacciones: Sequence[Transaccion],
        actual: UsuarioAutenticado,
        perfil_id: int | None = None,
        sobrescrituras: dict | None = None,
        descripcion: str = "",
        guardar: bool = True,
        advertencias_extra: list[str] | None = None,
    ) -> RegistroAnalisis:
        if not transacciones:
            raise DatosInsuficientes("No se recibieron transacciones")
        if len(transacciones) > self._max_transacciones:
            raise DatosInsuficientes(
                f"Se admiten como máximo {self._max_transacciones} transacciones por análisis"
            )

        perfil, parametros = self._perfiles.resolver_parametros(perfil_id, sobrescrituras)
        resultado = self._detector.analizar(transacciones, parametros)
        resultado.advertencias.extend(advertencias_extra or [])

        # Se guardan parámetros y resultado (auditable), no las transacciones en sí.
        registro = RegistroAnalisis(
            usuario_id=actual.usuario.id,
            perfil_id=perfil.id if perfil else None,
            descripcion=descripcion,
            parametros=parametros.model_dump(mode="json"),
            resultado=resultado.model_dump(mode="json"),
            puntaje=resultado.puntaje,
            nivel_riesgo=resultado.nivel_riesgo,
            total_transacciones=len(transacciones),
            creado_en=self._reloj(),
        )
        if guardar:
            self._analisis.guardar(registro)
        return registro

    def obtener(self, analisis_id: int, actual: UsuarioAutenticado) -> RegistroAnalisis:
        registro = self._analisis.obtener_por_id(analisis_id)
        if registro is None:
            raise NoEncontrado("Análisis no encontrado")
        if not actual.es_admin and registro.usuario_id != actual.usuario.id:
            raise PermisoDenegado("No tiene acceso a este análisis")
        return registro

    def listar(self, actual: UsuarioAutenticado, limite: int, desplazamiento: int) -> list[RegistroAnalisis]:
        usuario_id = None if actual.es_admin else actual.usuario.id
        return self._analisis.listar(usuario_id, limite, desplazamiento)
