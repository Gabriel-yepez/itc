import { PantallaAnalisis } from './pantallas/analisis/PantallaAnalisis'
import { PantallaCambioContrasena } from './pantallas/PantallaCambioContrasena'
import { PantallaCarga } from './pantallas/PantallaCarga'
import { PantallaConfigurarSegundoFactor } from './pantallas/PantallaConfigurarSegundoFactor'
import { PantallaLogin } from './pantallas/PantallaLogin'
import { PantallaSegundoFactor } from './pantallas/PantallaSegundoFactor'
import { useSesion } from './sesion/useSesion'

export default function App() {
  const {
    estado,
    iniciarSesion,
    verificarSegundoFactor,
    reiniciarIngreso,
    cerrarSesion,
    contrasenaCambiada,
    segundoFactorActivado,
  } = useSesion()

  switch (estado.fase) {
    case 'verificando':
      return <PantallaCarga />
    case 'anonima':
      return <PantallaLogin aviso={estado.aviso} onIniciarSesion={iniciarSesion} />
    case 'segundo_factor':
      return <PantallaSegundoFactor onVerificar={verificarSegundoFactor} onVolver={() => reiniciarIngreso()} />
    case 'activa':
      // Mismo orden que exige la API: primero la contraseña propia, luego el doble factor.
      if (estado.usuario.debe_cambiar_contrasena) {
        return (
          <PantallaCambioContrasena
            usuario={estado.usuario}
            onCambiada={contrasenaCambiada}
            onCerrarSesion={cerrarSesion}
          />
        )
      }
      if (estado.usuario.debe_configurar_segundo_factor) {
        return (
          <PantallaConfigurarSegundoFactor
            usuario={estado.usuario}
            onActivado={segundoFactorActivado}
            onCerrarSesion={cerrarSesion}
          />
        )
      }
      return <PantallaAnalisis usuario={estado.usuario} onCerrarSesion={cerrarSesion} />
  }
}
