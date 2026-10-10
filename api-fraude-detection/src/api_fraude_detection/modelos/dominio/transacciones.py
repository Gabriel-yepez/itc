from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from .parametros import Canal, Moneda, TipoOperacion


class Transaccion(BaseModel):
    """Operación bancaria a analizar. Se recomienda enviar `cuenta` anonimizada (hash)."""

    model_config = ConfigDict(extra="ignore")

    id: str | None = Field(default=None, max_length=100)
    monto: Decimal = Field(gt=0)
    moneda: Moneda = Moneda.VES
    fecha: date | None = None
    canal: Canal = Canal.OTRO
    tipo: TipoOperacion | None = None
    cuenta: str | None = Field(default=None, max_length=100)
    tasa_bcv: Decimal | None = Field(
        default=None, gt=0, description="Bs por USD vigente en la fecha de la operación"
    )
