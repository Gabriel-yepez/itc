export default function DevelopmentServices() {
  return (
    <section className="w-full py-16 sm:py-24" id="servicios">
      <div className="mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-tertiary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-tertiary mb-4">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          Ingeniería de Software
        </div>
        <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl">
          Competencias Principales
        </h2>
        <p className="mt-4 max-w-2xl font-body text-base text-black sm:text-lg">
          Equipos de desarrollo especializados dedicados a resolver desafíos técnicos complejos con soluciones elegantes, seguras y escalables.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Servicio 1: Aplicaciones Web */}
        <div id="web" className="group scroll-mt-24 rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-headline text-xl font-bold text-black mb-3">
            Aplicaciones Web
          </h3>
          <p className="font-body text-sm text-black leading-relaxed mb-6">
            Single-page applications de alto rendimiento y paneles empresariales complejos construidos con frameworks modernos y arquitecturas modulares.
          </p>
          <ul className="space-y-2 border-t border-neutral pt-4 font-label text-xs text-black">
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                ✓
              </span>
              React / Next.js / Vue
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                ✓
              </span>
              Micro-frontends
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                ✓
              </span>
              WebAssembly & Optimización
            </li>
          </ul>
        </div>

        {/* Servicio 2: Cloud & Backend (Span 2) */}
        <div id="cloud" className="group scroll-mt-24 rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-tertiary/40 hover:shadow-md md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary transition-transform group-hover:scale-110">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <span className="rounded-full bg-neutral px-3 py-1 font-label text-xs font-medium text-black">
                Escala Empresarial
              </span>
            </div>
            <h3 className="font-headline text-xl font-bold text-black mb-3">
              Arquitectura Cloud & Backend
            </h3>
            <p className="font-body text-sm text-black leading-relaxed max-w-2xl">
              Sistemas distribuidos resilientes diseñados para alta disponibilidad y estricta gobernanza de datos. Diseñamos soluciones que escalan horizontalmente mientras mantenemos principios de seguridad zero-trust.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral bg-neutral/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary font-bold font-label text-xs">01</span>
                <h4 className="font-headline text-sm font-semibold text-black">
                  API Gateways & Microservicios
                </h4>
              </div>
              <p className="font-body text-xs text-black">
                Microservicios GraphQL y RESTful desacoplados, rápidos y altamente tipados.
              </p>
            </div>
            <div className="rounded-xl border border-neutral bg-neutral/40 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-secondary font-bold font-label text-xs">02</span>
                <h4 className="font-headline text-sm font-semibold text-black">
                  Pipelines de Datos
                </h4>
              </div>
              <p className="font-body text-xs text-black">
                Procesamiento en tiempo real, almacenamiento analítico y data warehousing seguro.
              </p>
            </div>
          </div>
        </div>

        {/* Servicio 3: Desarrollo Móvil (Span 2) */}
        <div id="mobile" className="group scroll-mt-24 rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-secondary/40 hover:shadow-md md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-transform group-hover:scale-110">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-headline text-xl font-bold text-black mb-3">
              Desarrollo Móvil Multiplataforma
            </h3>
            <p className="font-body text-sm text-black leading-relaxed max-w-2xl">
              Aplicaciones nativas y multiplataforma que entregan experiencias de usuario fluidas en iOS y Android, respaldadas por integraciones biométricas, sincronización offline y rendimiento nativo.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
              Swift / iOS
            </span>
            <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
              Kotlin / Android
            </span>
            <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
              React Native
            </span>
            <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
              Flutter
            </span>
          </div>
        </div>

        {/* Servicio 4: DevSecOps */}
        <div id="devsecops" className="group scroll-mt-24 rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md flex flex-col justify-center items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="font-headline text-xl font-bold text-black mb-2">
            DevSecOps
          </h3>
          <p className="font-body text-sm text-black leading-relaxed">
            Pipelines de CI/CD automatizados con escaneo proactivo de seguridad, pruebas de vulnerabilidades y monitoreo continuo.
          </p>
        </div>
      </div>
    </section>
  );
}
