import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Sin prefijo VITE_: esta variable solo la usa el servidor de desarrollo y no llega al navegador.
  const { API_PROXY_TARGET = 'http://127.0.0.1:8000' } = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: {
      proxy: {
        // El front llama a /api/... en su mismo origen y Vite lo reenvía a FastAPI sin el prefijo.
        // Mismo origen => cookies de primer nivel, sin CORS y el CSRF nativo de axios funciona.
        '/api': {
          target: API_PROXY_TARGET,
          rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        },
      },
    },
  }
})
