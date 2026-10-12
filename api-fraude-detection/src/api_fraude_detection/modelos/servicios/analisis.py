from collections.abc import Callable, Sequence
from datetime import datetime

from ...core.errores import DatosInsuficientes, NoEncontrado
from ..dominio.detector import DetectorFraude
from ..dominio.entidades import RegistroAnalisis, ahora
from ..dominio.transacciones import Transaccion
from ..repositorios.interfaces import RepositorioAnalisis
from .auditoria import ServicioAuditoria
from .autenticacion import UsuarioAutenticado
from .perfiles import ServicioPerfiles


class ServicioAnalisis:
    def __init__(
        self,
        detector: DetectorFraude,
        perfiles: ServicioPerfiles,
        analisis: RepositorioAnalisis,
        max_transacciones: int,
        auditoria: ServicioAuditoria | None = None,
        reloj: Callable[[], datetime] = ahora,
    ):
        self._detector = detector
        self._perfiles = perfiles
        self._analisis = analisis
        self._max_transacciones = max_transacciones
        self._auditoria = auditoria
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
        if self._auditoria is not None:
            # Quién analizó qué volumen y con qué resultado (sin montos ni cuentas).
            self._auditoria.registrar(
                "analisis_ejecutado",
                analisis_id=registro.id,
                transacciones=registro.total_transacciones,
                nivel_riesgo=registro.nivel_riesgo.value,
                perfil_id=registro.perfil_id,
            )
        return registro

    def obtener(self, analisis_id: int, actual: UsuarioAutenticado) -> RegistroAnalisis:
        registro = self._analisis.obtener_por_id(analisis_id)
        # El análisis de otro usuario responde igual que uno inexistente: un 403 confirmaría que
        # ese número de expediente existe.
        if registro is None or (not actual.es_admin and registro.usuario_id != actual.usuario.id):
            raise NoEncontrado("Análisis no encontrado")
        return registro

    def listar(self, actual: UsuarioAutenticado, limite: int, desplazamiento: int) -> list[RegistroAnalisis]:
        usuario_id = None if actual.es_admin else actual.usuario.id
        return self._analisis.listar(usuario_id, limite, desplazamiento)
