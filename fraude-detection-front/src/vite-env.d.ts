/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto "/api" (mismo origen, vía proxy). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
