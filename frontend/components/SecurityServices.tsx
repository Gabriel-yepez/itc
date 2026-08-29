import Link from "next/link";

export default function SecurityServices() {
  const certifications = [
    { label: "ISO 27001 COMPLIANT", code: "ISO-27001" },
    { label: "SOC 2 TYPE II", code: "SOC-2" },
    { label: "ZERO-TRUST NATIVO", code: "Z-TRUST" },
    { label: "OWASP TOP 10 HARDENING", code: "OWASP" },
    { label: "NIST FRAMEWORK", code: "NIST" },
  ];

  return (
    <div className="w-full space-y-16">
      {/* Header Section */}
      <section className="mb-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-primary mb-6">
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Ciberseguridad Empresarial
            </div>

            <h2 className="font-headline text-4xl font-black tracking-tight text-black sm:text-5xl lg:text-6xl">
              Protección Sin Concesiones para Infraestructuras Críticas.
            </h2>

            <p className="mt-6 max-w-2xl font-body text-base text-black sm:text-lg leading-relaxed">
              Monitoreo avanzado de amenazas, auditorías de seguridad quirúrgicas y protocolos de protección de datos de grado militar diseñados para entornos de alta exigencia.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contacto"
                className="rounded-xl bg-primary px-6 py-3 font-body text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Solicitar Auditoría
              </Link>
              <Link
                href="/seguridad"
                className="rounded-xl border border-neutral bg-white px-6 py-3 font-body text-sm font-semibold text-black transition-colors hover:bg-neutral/60"
              >
                Ver Informe Técnico
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-4/3 w-full rounded-2xl border border-neutral bg-neutral/50 p-8 flex flex-col justify-between overflow-hidden shadow-sm">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:20px_20px]" />
              
              {/* Radar / Shield Animation Concept */}
              <div className="relative z-10 flex justify-between items-start">
                <span className="font-label text-xs font-bold uppercase text-black">
                  ESTADO DE RED
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-0.5 font-label text-[11px] font-bold text-secondary border border-secondary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                  ONLINE
                </span>
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center my-4">
                <div className="relative flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full border border-dashed border-primary/40 animate-[spin_25s_linear_infinite]" />
                  <div className="absolute flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <span className="font-headline text-base font-bold text-black mt-3">
                  Infraestructura Blindada
                </span>
                <span className="font-label text-xs text-black">
                  Monitoreo 24/7 en tiempo real
                </span>
              </div>

              <div className="relative z-10 flex justify-between items-center border-t border-neutral/60 pt-3 font-label text-xs text-black">
                <span>DISPONIBILIDAD</span>
                <span className="font-bold text-secondary">99.999% SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications Bar */}
      <section className="rounded-2xl border border-neutral bg-neutral/20 p-6 sm:p-8">
        <p className="font-label text-xs text-center font-bold text-black uppercase tracking-wider mb-6">
          Estándares de Cumplimiento & Certificaciones
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {certifications.map((item) => (
            <div
              key={item.code}
              className="flex items-center gap-2 rounded-xl border border-neutral bg-white px-4 py-2 shadow-xs"
            >
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-label text-xs font-bold text-black">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Core Defense Mechanisms Bento Grid */}
      <section className="w-full" id="seguridad-mecanismos">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-secondary mb-4">
            Defensa Integral
          </div>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Mecanismos Principales de Defensa
          </h3>
          <p className="mt-3 max-w-2xl font-body text-base text-black">
            Arquitectura de capas múltiples diseñada para prevenir, detectar y neutralizar vectores de ataque antes de que impacten la continuidad operativa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Auditorías de Seguridad (Span 2) */}
          <div className="group rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-semibold text-primary">
                  ISO 27001 Compliant
                </span>
              </div>
              <h4 className="font-headline text-xl font-bold text-black mb-3">
                Auditorías Exhaustivas de Seguridad & Pentesting
              </h4>
              <p className="font-body text-sm text-black leading-relaxed max-w-2xl">
                Examen quirúrgico de tu arquitectura, código fuente e infraestructura para identificar vulnerabilidades antes de que sean explotadas. Entregamos informes ejecutivos con planes de mitigación inmediatos.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-neutral pt-6">
              <div className="flex items-start gap-2">
                <span className="font-label text-xs font-bold text-primary">01</span>
                <div>
                  <h5 className="font-headline text-sm font-semibold text-black">Pruebas de Penetración</h5>
                  <p className="font-body text-xs text-black">Simulación de ataques de día cero y vectores avanzados.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-label text-xs font-bold text-secondary">02</span>
                <div>
                  <h5 className="font-headline text-sm font-semibold text-black">Análisis de Código Estático/Dinámico</h5>
                  <p className="font-body text-xs text-black">Escaneo automatizado de vulnerabilidades en CI/CD.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 24/7 Threat Monitoring (Span 1) */}
          <div className="group rounded-2xl border border-neutral bg-neutral/30 p-8 shadow-sm transition-all duration-300 hover:border-tertiary/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-headline text-xl font-bold text-black mb-3">
                Monitoreo Continuo 24/7
              </h4>
              <p className="font-body text-sm text-black leading-relaxed mb-6">
                Análisis en tiempo real del tráfico de red mediante modelos de detección de anomalías para neutralizar intrusiones al instante.
              </p>
            </div>

            {/* Terminal Mockup */}
            <div className="rounded-xl border border-neutral bg-white p-4 font-label text-xs space-y-1 shadow-inner">
              <div className="text-primary font-bold">&gt; _SOC_RADAR: ACTIVO</div>
              <div className="text-black">TRAFFIC_HEALTH: 100%</div>
              <div className="text-secondary font-semibold">ANOMALIES_DETECTED: 0</div>
            </div>
          </div>

          {/* Card 3: Data Protection & Zero-Trust */}
          <div className="group rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-secondary/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-headline text-xl font-bold text-black mb-3">
                Protección de Datos & Cifrado
              </h4>
              <p className="font-body text-sm text-black leading-relaxed">
                Cifrado de extremo a extremo en tránsito (TLS 1.3) y en reposo (AES-256). Respaldos inmutables y controles de acceso basados en roles (RBAC).
              </p>
            </div>
            <div className="mt-6 border-t border-neutral pt-4 font-label text-xs text-black">
              Cifrado AES-256 + HSM
            </div>
          </div>

          {/* Card 4: Respuesta Rápida a Incidentes (Span 2) */}
          <div className="group rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="font-headline text-xl font-bold text-black mb-3">
                Respuesta a Incidentes con SLA Garantizado
              </h4>
              <p className="font-body text-sm text-black leading-relaxed max-w-2xl">
                Equipo de respuesta ante incidentes (CSIRT) de élite disponible con tiempos de respuesta contractualmente garantizados para contener, aislar y erradicar cualquier intento de vulneración.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
                Tiempo de Respuesta &lt; 15 min
              </span>
              <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
                Análisis Forense Digital
              </span>
              <span className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black">
                Recuperación ante Desastres (DRP)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Security Methodology */}
      <section className="rounded-3xl border border-neutral bg-neutral/30 p-8 sm:p-12">
        <div className="mb-10 text-center">
          <span className="font-label text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block">
            Proceso de Endurecimiento
          </span>
          <h3 className="font-headline text-2xl font-bold text-black sm:text-3xl">
            Ciclo de Vida de Seguridad Defensiva
          </h3>
          <p className="mx-auto mt-2 max-w-xl font-body text-sm text-black sm:text-base">
            Cómo aseguramos que cada capa de tu infraestructura sea impenetrable y resiliente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral bg-white p-6 shadow-sm">
            <div className="font-headline text-2xl font-black text-primary mb-2">01</div>
            <h4 className="font-headline text-base font-bold text-black mb-2">Mapeo de Superficie</h4>
            <p className="font-body text-xs text-black leading-relaxed">
              Identificación y evaluación de todos los activos, APIs y puntos de entrada expuestos.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral bg-white p-6 shadow-sm">
            <div className="font-headline text-2xl font-black text-tertiary mb-2">02</div>
            <h4 className="font-headline text-base font-bold text-black mb-2">Simulación de Ataque</h4>
            <p className="font-body text-xs text-black leading-relaxed">
              Ejecución de pruebas intrusivas controladas para validar las defensas existentes.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral bg-white p-6 shadow-sm">
            <div className="font-headline text-2xl font-black text-secondary mb-2">03</div>
            <h4 className="font-headline text-base font-bold text-black mb-2">Remediación & Hardening</h4>
            <p className="font-body text-xs text-black leading-relaxed">
              Aplicación de parches de arquitectura, segmentación de redes y políticas Zero-Trust.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral bg-white p-6 shadow-sm">
            <div className="font-headline text-2xl font-black text-primary mb-2">04</div>
            <h4 className="font-headline text-base font-bold text-black mb-2">Monitoreo & Telemetría</h4>
            <p className="font-body text-xs text-black leading-relaxed">
              Supervisión continua con alertas automáticas y auditorías periódicas de cumplimiento.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
