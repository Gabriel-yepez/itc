"""Motor de detección de fraude: normaliza las operaciones al contexto venezolano
(reconversiones, bolívares/dólares a tasa BCV), aplica las pruebas de Benford y
complementa con señales de fraccionamiento bajo umbrales y de montos redondos.
"""

import math
from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol

from .benford.pruebas import ejecutar_prueba
from .parametros import (
    RECONVERSIONES_VES,
    Canal,
    Conformidad,
    CriterioAgrupacion,
    Moneda,
    NivelRiesgo,
    ParametrosDeteccion,
    PruebaBenford,
    UmbralVigilado,
)
from .resultados import (
    ResultadoAnalisis,
    ResultadoGrupo,
    ResultadoPrueba,
    ResultadoRedondeo,
    ResultadoUmbral,
)
from .transacciones import Transaccion

NOMBRES_PRUEBAS = {
    PruebaBenford.PRIMER_DIGITO: "primer dígito",
    PruebaBenford.SEGUNDO_DIGITO: "segundo dígito",
    PruebaBenford.PRIMEROS_DOS_DIGITOS: "primeros dos dígitos",
    PruebaBenford.ULTIMOS_DOS_DIGITOS: "últimos dos dígitos",
}


class DetectorFraude(Protocol):
    def analizar(
        self, transacciones: Sequence[Transaccion], parametros: ParametrosDeteccion
    ) -> ResultadoAnalisis: ...


@dataclass(frozen=True, slots=True)
class _Operacion:
    monto_nominal: Decimal  # tal como se registró (para la prueba de redondeo)
    monto_moneda: Decimal  # reconvertido a la unidad monetaria actual, en su moneda
    monto_base: Decimal  # convertido a la moneda base del análisis
    moneda: Moneda
    tasa: Decimal | None  # Bs (actuales) por USD
    canal: Canal
    cuenta: str | None


def factor_reconversion(fecha: date | None) -> Decimal:
    """Divisor que lleva bolívares de `fecha` a bolívares digitales (sin fecha se asume actual)."""
    if fecha is None:
        return Decimal(1)
    for hasta, factor in RECONVERSIONES_VES:
        if fecha < hasta:
            return factor
    return Decimal(1)


def convertir(monto: Decimal, de: Moneda, a: Moneda, tasa: Decimal | None) -> Decimal | None:
    if de is a:
        return monto
    if tasa is None:
        return None
    return monto / tasa if de is Moneda.VES else monto * tasa


def clasificar_riesgo(puntaje: float, parametros: ParametrosDeteccion) -> NivelRiesgo:
    cortes = parametros.cortes_nivel_riesgo
    if puntaje >= cortes.critico:
        return NivelRiesgo.CRITICO
    if puntaje >= cortes.alto:
        return NivelRiesgo.ALTO
    if puntaje >= cortes.medio:
        return NivelRiesgo.MEDIO
    return NivelRiesgo.BAJO


class DetectorBenford:
    def analizar(
        self, transacciones: Sequence[Transaccion], parametros: ParametrosDeteccion
    ) -> ResultadoAnalisis:
        excluidas: Counter[str] = Counter()
        poblacion = [
            op for tx in transacciones if (op := self._normalizar(tx, parametros, excluidas)) is not None
        ]
        resultado = self._analizar_poblacion(poblacion, parametros, excluidas, len(transacciones))
        if parametros.agrupar_por is not None:
            self._analizar_grupos(poblacion, parametros, resultado)
        return resultado

    # ------------------------------------------------------------------ normalización

    def _normalizar(
        self, tx: Transaccion, parametros: ParametrosDeteccion, excluidas: Counter[str]
    ) -> _Operacion | None:
        if parametros.canales and tx.canal not in parametros.canales:
            excluidas["canal_no_seleccionado"] += 1
            return None
        if parametros.tipos_operacion and tx.tipo not in parametros.tipos_operacion:
            excluidas["tipo_no_seleccionado"] += 1
            return None

        # Los montos en bolívares (y las tasas Bs/USD) de fechas anteriores a una
        # reconversión se llevan a bolívares digitales.
        factor = factor_reconversion(tx.fecha) if parametros.aplicar_reconversion else Decimal(1)
        monto_moneda = tx.monto / factor if tx.moneda is Moneda.VES else tx.monto
        tasa = tx.tasa_bcv / factor if tx.tasa_bcv else parametros.tasa_bcv_predeterminada

        monto_base = convertir(monto_moneda, tx.moneda, parametros.moneda_base, tasa)
        if monto_base is None:
            excluidas["sin_tasa_de_cambio"] += 1
            return None
        return _Operacion(
            monto_nominal=tx.monto,
            monto_moneda=monto_moneda,
            monto_base=monto_base,
            moneda=tx.moneda,
            tasa=tasa,
            canal=tx.canal,
            cuenta=tx.cuenta,
        )

    # ------------------------------------------------------------------ análisis

    def _analizar_poblacion(
        self,
        poblacion: list[_Operacion],
        parametros: ParametrosDeteccion,
        excluidas: Counter[str],
        total_recibidas: int,
    ) -> ResultadoAnalisis:
        excluidas = Counter(excluidas)
        muestra: list[_Operacion] = []
        for op in poblacion:
            if op.monto_base < parametros.monto_minimo:
                excluidas["bajo_monto_minimo"] += 1
            elif parametros.monto_maximo is not None and op.monto_base > parametros.monto_maximo:
                excluidas["sobre_monto_maximo"] += 1
            else:
                muestra.append(op)

        montos = [op.monto_base for op in muestra]
        advertencias: list[str] = []
        if len(muestra) < parametros.tamano_muestra_minimo:
            advertencias.append(
                f"Solo {len(muestra)} operaciones válidas (mínimo configurado: "
                f"{parametros.tamano_muestra_minimo}). Las pruebas de Benford se reportan "
                "como orientativas y no suman al puntaje."
            )

        minimo = min(montos, default=None)
        maximo = max(montos, default=None)
        ordenes = math.log10(maximo / minimo) if minimo and maximo else None
        if ordenes is not None and ordenes < 2:
            advertencias.append(
                f"Los montos abarcan solo {ordenes:.1f} órdenes de magnitud. Benford es poco "
                "fiable en rangos estrechos (p. ej., operaciones con tope como Pago Móvil)."
            )

        pruebas = [ejecutar_prueba(prueba, montos, parametros) for prueba in parametros.pruebas]
        umbrales = [
            self._evaluar_umbral(umbral, poblacion, parametros, advertencias)
            for umbral in parametros.umbrales_vigilados
        ]
        redondeo = self._evaluar_redondeo(poblacion, parametros)

        # Las pruebas de dígitos miden el mismo fenómeno: cuenta la más severa.
        puntaje = max((p.puntos for p in pruebas), default=0.0)
        puntaje += sum(u.puntos for u in umbrales)
        puntaje += redondeo.puntos if redondeo else 0.0
        puntaje = round(min(puntaje, 100.0), 2)

        return ResultadoAnalisis(
            moneda_base=parametros.moneda_base,
            total_recibidas=total_recibidas,
            total_analizadas=len(muestra),
            excluidas=dict(excluidas),
            monto_minimo_observado=minimo,
            monto_maximo_observado=maximo,
            ordenes_de_magnitud=round(ordenes, 2) if ordenes is not None else None,
            pruebas=pruebas,
            umbrales=umbrales,
            redondeo=redondeo,
            grupos=[],
            grupos_omitidos_por_tamano=0,
            puntaje=puntaje,
            nivel_riesgo=clasificar_riesgo(puntaje, parametros),
            hallazgos=self._redactar_hallazgos(pruebas, umbrales, redondeo),
            advertencias=advertencias,
        )

    def _evaluar_umbral(
        self,
        umbral: UmbralVigilado,
        poblacion: list[_Operacion],
        parametros: ParametrosDeteccion,
        advertencias: list[str],
    ) -> ResultadoUmbral:
        tolerancia = Decimal(str(umbral.tolerancia_pct)) / 100
        desde = umbral.monto * (1 - tolerancia)
        hasta = umbral.monto * (1 + tolerancia)
        debajo = encima = sin_tasa = 0
        for op in poblacion:
            monto = convertir(op.monto_moneda, op.moneda, umbral.moneda, op.tasa)
            if monto is None:
                sin_tasa += 1
            elif desde <= monto < umbral.monto:
                debajo += 1
            elif umbral.monto <= monto < hasta:
                encima += 1
        if sin_tasa:
            advertencias.append(
                f"{sin_tasa} operaciones no se evaluaron contra '{umbral.nombre}' por falta de tasa BCV."
            )

        # Con densidad Benford (∝ 1/x) la banda inferior contiene naturalmente algo más
        # de operaciones que la superior: ln(1/(1-t)) / ln(1+t).
        t = umbral.tolerancia_pct / 100
        razon_esperada = math.log(1 / (1 - t)) / math.log(1 + t)
        razon = debajo / encima if encima else None
        alerta = debajo >= parametros.minimo_transacciones_banda and (
            razon is None or razon > parametros.factor_concentracion_umbral * razon_esperada
        )
        return ResultadoUmbral(
            nombre=umbral.nombre,
            monto=umbral.monto,
            moneda=umbral.moneda,
            banda_inferior_desde=desde,
            banda_superior_hasta=hasta,
            en_banda_inferior=debajo,
            en_banda_superior=encima,
            razon_observada=round(razon, 4) if razon is not None else None,
            razon_esperada=round(razon_esperada, 4),
            alerta=alerta,
            puntos=parametros.ponderaciones.concentracion_bajo_umbral if alerta else 0.0,
        )

    def _evaluar_redondeo(
        self, poblacion: list[_Operacion], parametros: ParametrosDeteccion
    ) -> ResultadoRedondeo | None:
        multiplo = parametros.multiplo_redondo
        candidatos = [
            op
            for op in poblacion
            if op.canal not in parametros.canales_excluidos_redondeo and op.monto_nominal >= multiplo
        ]
        if not candidatos:
            return None
        redondos = sum(1 for op in candidatos if op.monto_nominal % multiplo == 0)
        proporcion = redondos / len(candidatos)
        esperada = 1 / multiplo
        alerta = (
            redondos >= parametros.minimo_transacciones_banda
            and proporcion > parametros.factor_exceso_redondos * esperada
        )
        return ResultadoRedondeo(
            multiplo=multiplo,
            evaluados=len(candidatos),
            redondos=redondos,
            proporcion=round(proporcion, 6),
            esperada=esperada,
            alerta=alerta,
            puntos=parametros.ponderaciones.exceso_montos_redondos if alerta else 0.0,
        )

    def _analizar_grupos(
        self, poblacion: list[_Operacion], parametros: ParametrosDeteccion, resultado: ResultadoAnalisis
    ) -> None:
        grupos: dict[str, list[_Operacion]] = defaultdict(list)
        for op in poblacion:
            if parametros.agrupar_por is CriterioAgrupacion.CUENTA:
                clave = op.cuenta or "(sin cuenta)"
            else:
                clave = op.canal.value
            grupos[clave].append(op)

        parametros_grupo = parametros.model_copy(update={"agrupar_por": None})
        evaluados: list[ResultadoGrupo] = []
        for clave, operaciones in grupos.items():
            parcial = self._analizar_poblacion(operaciones, parametros_grupo, Counter(), len(operaciones))
            if parcial.total_analizadas < parametros.tamano_muestra_minimo:
                resultado.grupos_omitidos_por_tamano += 1
                continue
            primer_digito = next(
                (p for p in parcial.pruebas if p.prueba is PruebaBenford.PRIMER_DIGITO), None
            )
            evaluados.append(
                ResultadoGrupo(
                    clave=clave,
                    total_analizadas=parcial.total_analizadas,
                    puntaje=parcial.puntaje,
                    nivel_riesgo=parcial.nivel_riesgo,
                    conformidad_primer_digito=primer_digito.conformidad if primer_digito else None,
                    hallazgos=parcial.hallazgos,
                )
            )

        evaluados.sort(key=lambda g: g.puntaje, reverse=True)
        resultado.grupos = evaluados[: parametros.max_grupos_reportados]
        riesgosos = [g for g in evaluados if g.nivel_riesgo in (NivelRiesgo.ALTO, NivelRiesgo.CRITICO)]
        if riesgosos:
            criterio = parametros.agrupar_por.value
            resultado.hallazgos.append(
                f"{len(riesgosos)} grupo(s) por {criterio} con riesgo alto o crítico: "
                + ", ".join(g.clave for g in riesgosos[:10])
                + ("…" if len(riesgosos) > 10 else "")
            )
        if resultado.grupos_omitidos_por_tamano:
            resultado.advertencias.append(
                f"{resultado.grupos_omitidos_por_tamano} grupo(s) no se evaluaron por no alcanzar "
                f"{parametros.tamano_muestra_minimo} operaciones."
            )

    # ------------------------------------------------------------------ redacción

    @staticmethod
    def _redactar_hallazgos(
        pruebas: list[ResultadoPrueba],
        umbrales: list[ResultadoUmbral],
        redondeo: ResultadoRedondeo | None,
    ) -> list[str]:
        hallazgos: list[str] = []
        for p in pruebas:
            if not p.muestra_suficiente:
                continue
            nombre = NOMBRES_PRUEBAS[p.prueba]
            if p.conformidad in (Conformidad.MARGINAL, Conformidad.NO_CONFORMIDAD):
                texto = "conformidad marginal" if p.conformidad is Conformidad.MARGINAL else "no conformidad"
                hallazgos.append(
                    f"Prueba de {nombre}: {texto} con la Ley de Benford "
                    f"(MAD = {p.mad:.4f}; esperada por azar ≈ {p.mad_esperada_por_azar:.4f})."
                )
            elif p.conformidad is Conformidad.NO_APLICA and p.chi_cuadrado_significativo:
                hallazgos.append(
                    f"Prueba de {nombre}: distribución distinta de la esperada (p = {p.valor_p:.4f})."
                )
            excesos = [f.digito for f in p.frecuencias if f.atipico and f.proporcion > f.esperada]
            if excesos:
                hallazgos.append(
                    f"Prueba de {nombre}: exceso significativo en "
                    + ", ".join(str(d) for d in excesos[:15])
                    + ("…" if len(excesos) > 15 else "")
                    + "."
                )
        for u in umbrales:
            if u.alerta:
                hallazgos.append(
                    f"Posible fraccionamiento bajo '{u.nombre}': {u.en_banda_inferior} operaciones entre "
                    f"{u.banda_inferior_desde:,.2f} y {u.monto:,.2f} {u.moneda} frente a "
                    f"{u.en_banda_superior} justo por encima (razón esperada ≈ {u.razon_esperada:.2f})."
                )
        if redondeo and redondeo.alerta:
            hallazgos.append(
                f"Exceso de montos redondos: {redondeo.proporcion:.1%} son múltiplos de "
                f"{redondeo.multiplo} (esperado ≈ {redondeo.esperada:.1%})."
            )
        if not hallazgos:
            hallazgos.append("No se detectaron desviaciones relevantes respecto a la Ley de Benford.")
        return hallazgos
