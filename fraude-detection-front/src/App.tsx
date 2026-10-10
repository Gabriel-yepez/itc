import { PantallaAnalisis } from './pantallas/analisis/PantallaAnalisis'
import { PantallaCarga } from './pantallas/PantallaCarga'
import { PantallaLogin } from './pantallas/PantallaLogin'
import { useSesion } from './sesion/useSesion'

export default function App() {
  const { estado, iniciarSesion, cerrarSesion } = useSesion()

  switch (estado.fase) {
    case 'verificando':
      return <PantallaCarga />
    case 'anonima':
      return <PantallaLogin aviso={estado.aviso} onIniciarSesion={iniciarSesion} />
    case 'activa':
      return <PantallaAnalisis usuario={estado.usuario} onCerrarSesion={cerrarSesion} />
  }
}
