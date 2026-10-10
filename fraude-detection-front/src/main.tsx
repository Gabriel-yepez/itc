import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fuentes servidas desde el propio sitio (la CSP de producción no permite CDNs externos).
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource-variable/archivo/wght.css'
import './index.css'

import App from './App.tsx'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el elemento #root')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
