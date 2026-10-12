/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto "/api" (mismo origen, vía proxy). */
  readonly VITE_API_URL?: string
  /** Nombre de la cookie CSRF si difiere del que elige el backend (FRAUDE_COOKIE_CSRF_NOMBRE). */
  readonly VITE_COOKIE_CSRF?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
