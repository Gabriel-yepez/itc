from collections.abc import Callable
from datetime import datetime
from decimal import Decimal

from ..core.errores import Conflicto, NoEncontrado
from ..dominio.entidades import PerfilDeteccion, ahora
from ..dominio.parametros import (
    Canal,
    CriterioAgrupacion,
    Moneda,
    ParametrosDeteccion,
    UmbralVigilado,
)
from ..repositorios.interfaces import RepositorioPerfiles

NOMBRE_PERFIL_INICIAL = "Banca venezolana - referencia"


def parametros_referencia_venezuela() -> ParametrosDeteccion:
    """Punto de partida para banca venezolana. Los montos de los umbrales son EJEMPLOS:
    deben ajustarse a la normativa SUDEBAN vigente y a los límites de cada institución."""
    return ParametrosDeteccion(
        moneda_base=Moneda.VES,
        aplicar_reconversion=True,
        monto_minimo=Decimal(10),
        tamano_muestra_minimo=300,
        agrupar_por=CriterioAgrupacion.CANAL,
        umbrales_vigilados=[
            UmbralVigilado(
                nombre="Umbral de reporte de efectivo (ejemplo, ajustar a SUDEBAN)",
                monto=Decimal(10_000),
                moneda=Moneda.USD,
                tolerancia_pct=10,
            ),
        ],
        canales_excluidos_redondeo=[Canal.EFECTIVO, Canal.DIVISAS],
    )


class ServicioPerfiles:
    def __init__(self, perfiles: RepositorioPerfiles, reloj: Callable[[], datetime] = ahora):
        self._perfiles = perfiles
        self._reloj = reloj

    def listar(self) -> list[PerfilDeteccion]:
        return self._perfiles.listar()

    def obtener(self, perfil_id: int) -> PerfilDeteccion:
        perfil = self._perfiles.obtener_por_id(perfil_id)
        if perfil is None:
            raise NoEncontrado("Perfil de detección no encontrado")
        return perfil

    def resolver_parametros(
        self, perfil_id: int | None, sobrescrituras: dict | None
    ) -> tuple[PerfilDeteccion | None, ParametrosDeteccion]:
        """Parámetros efectivos: perfil indicado > perfil predeterminado > valores por defecto,
        y encima las sobrescrituras puntuales de la petición."""
        perfil = self.obtener(perfil_id) if perfil_id is not None else self._perfiles.obtener_predeterminado()
        base = perfil.parametros if perfil else ParametrosDeteccion()
        return perfil, base.con_cambios(sobrescrituras) if sobrescrituras else base

    def crear(
        self,
        nombre: str,
        parametros: ParametrosDeteccion,
        descripcion: str,
        predeterminado: bool,
        creado_por: int | None,
    ) -> PerfilDeteccion:
        if self._perfiles.obtener_por_nombre(nombre):
            raise Conflicto(f"Ya existe un perfil llamado '{nombre}'")
        momento = self._reloj()
        perfil = self._perfiles.guardar(
            PerfilDeteccion(
                nombre=nombre,
                parametros=parametros,
                descripcion=descripcion,
                predeterminado=predeterminado,
                creado_por=creado_por,
                creado_en=momento,
                actualizado_en=momento,
            )
        )
        if predeterminado:
            self._perfiles.quitar_predeterminado(excepto_id=perfil.id)
        return perfil

    def actualizar(
        self,
        perfil_id: int,
        nombre: str | None = None,
        descripcion: str | None = None,
        predeterminado: bool | None = None,
        cambios_parametros: dict | None = None,
    ) -> PerfilDeteccion:
        perfil = self.obtener(perfil_id)
        if nombre is not None and nombre != perfil.nombre:
            if self._perfiles.obtener_por_nombre(nombre):
                raise Conflicto(f"Ya existe un perfil llamado '{nombre}'")
            perfil.nombre = nombre
        if descripcion is not None:
            perfil.descripcion = descripcion
        if cambios_parametros:
            perfil.parametros = perfil.parametros.con_cambios(cambios_parametros)
        if predeterminado is not None:
            perfil.predeterminado = predeterminado
        perfil.actualizado_en = self._reloj()
        self._perfiles.guardar(perfil)
        if perfil.predeterminado:
            self._perfiles.quitar_predeterminado(excepto_id=perfil.id)
        return perfil

    def eliminar(self, perfil_id: int) -> None:
        perfil = self.obtener(perfil_id)
        if perfil.predeterminado:
            raise Conflicto("No se puede eliminar el perfil predeterminado; marque otro primero")
        self._perfiles.eliminar(perfil_id)

    def asegurar_perfil_inicial(self) -> None:
        if not self._perfiles.listar():
            self.crear(
                NOMBRE_PERFIL_INICIAL,
                parametros_referencia_venezuela(),
                "Perfil de referencia: bolívares digitales con reconversión, segmentado por canal.",
                predeterminado=True,
                creado_por=None,
            )
