# Fraude Detection — Frontend

## Conexión con la API

```bash
pnpm install
pnpm dev            # http://localhost:5173 — /api se reenvía a FastAPI (127.0.0.1:8000)
```

La API debe estar corriendo (ver `../api-fraude-detection`). En desarrollo local sin HTTPS,
el backend necesita `FRAUDE_COOKIE_SEGURA=false`.

### Capa `src/api`

```
src/api/
├── config.ts           URL base (VITE_API_URL, por defecto /api), timeouts, nombres CSRF
├── clienteHttp.ts      instancia de axios con opciones seguras
├── ApiBase.ts          clase base: peticion({ metodo, ruta, body, headers, ... }) + get/post/put/patch/delete
├── errores.ts          ErrorApi: único tipo de error que ve la UI
├── sesion.ts           alExpirarSesion(): aviso global ante un 401
├── tipos.ts            tipos del contrato con el backend
└── servicios/          AuthApi, UsuariosApi, PerfilesApi, AnalisisApi (extienden ApiBase)
```

```ts
import { api, ErrorApi, alExpirarSesion } from './api'

alExpirarSesion(() => navegarAlLogin())

try {
  await api.auth.iniciarSesion({ usuario, contrasena })
  const analisis = await api.analisis.analizar({ transacciones })
} catch (e) {
  if (e instanceof ErrorApi) mostrar(e.message, e.validaciones)
}
```

Nuevo endpoint = nuevo método en un servicio:

```ts
export class ReportesApi extends ApiBase {
  obtener(id: number) {
    return this.get<Reporte>('/reportes/:id', { parametrosRuta: { id } })
  }
}
```

### Seguridad

- **Sesión en cookie HttpOnly**: el token nunca está al alcance de JavaScript ni en localStorage.
- **CSRF con el mecanismo nativo de axios** (`xsrfCookieName`/`xsrfHeaderName`): solo se envía a
  nuestro propio origen.
- **`allowAbsoluteUrls: false`**: ninguna ruta puede sacar la petición (ni las cookies) fuera de la API.
- **Rutas con parámetros codificados** (`encodeURIComponent`) y rechazo de segmentos `.`/`..`.
- **Errores normalizados**: la UI no recibe objetos de axios con cabeceras o configuración interna.
- **Mismo origen vía proxy** (`/api`): en desarrollo lo hace Vite; en producción, Caddy
  (ver [`Caddyfile`](Caddyfile) y [`../despliegue-fraude`](../despliegue-fraude/README.md)).

### Cadena de suministro

`axios` está fijado a una versión exacta (`1.20.0`), con procedencia firmada (SLSA) y sin las
dependencias de las versiones comprometidas en marzo de 2026 (1.14.1 / 0.30.4).
`pnpm-workspace.yaml` añade además:

| Ajuste | Efecto |
|---|---|
| `minimumReleaseAge: 1440` | no instala versiones publicadas hace menos de 24 h |
| `trustPolicy: no-downgrade` | rechaza versiones con menos evidencia de procedencia que las anteriores |
| `strictDepBuilds: true` | ninguna dependencia ejecuta scripts `postinstall` sin aprobación |

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
