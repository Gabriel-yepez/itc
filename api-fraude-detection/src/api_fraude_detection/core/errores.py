class ErrorDominio(Exception):
    """Error de negocio; la capa HTTP lo traduce a una respuesta con `codigo_http`."""

    codigo_http = 400

    def __init__(self, mensaje: str):
        super().__init__(mensaje)
        self.mensaje = mensaje


class NoEncontrado(ErrorDominio):
    codigo_http = 404


class Conflicto(ErrorDominio):
    codigo_http = 409


class CredencialesInvalidas(ErrorDominio):
    codigo_http = 401


class DemasiadasSolicitudes(ErrorDominio):
    codigo_http = 429


class NoAutenticado(ErrorDominio):
    codigo_http = 401


class PermisoDenegado(ErrorDominio):
    codigo_http = 403


class DatosInsuficientes(ErrorDominio):
    codigo_http = 422
