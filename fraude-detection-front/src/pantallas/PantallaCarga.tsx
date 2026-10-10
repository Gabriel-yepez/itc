import { Marca } from '../componentes/Marca'

export function PantallaCarga() {
  return (
    <main className="grid min-h-screen animate-aparecer place-content-center justify-items-center gap-4" aria-busy="true">
      <Marca />
      <p className="rotulo">Verificando sesión…</p>
    </main>
  )
}
