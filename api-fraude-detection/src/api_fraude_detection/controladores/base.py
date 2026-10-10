from pydantic import BaseModel, ConfigDict


class Solicitud(BaseModel):
    """Base de los datos de entrada que reciben los controladores: rechaza campos desconocidos."""

    model_config = ConfigDict(extra="forbid")
