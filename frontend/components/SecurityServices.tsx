import Link from "next/link";
import { Icon } from "@/components/icons";
import {
  ACCENT_BADGE,
  ACCENT_HOVER_BORDER,
  ACCENT_TEXT,
  LAYOUT,
} from "@/lib/cms/presentation";
import type {
  Certification,
  CmsHero,
  CmsSectionHeading,
  MethodologyStep,
  Service,
} from "@/lib/cms/types";

const defaultCertifications: Certification[] = [
  { id: 1, documentId: "cert-1", createdAt: "", updatedAt: "", publishedAt: "", label: "ISO 27001 COMPLIANT", code: "ISO-27001", icon: null, badge: null, order: 1 },
  { id: 2, documentId: "cert-2", createdAt: "", updatedAt: "", publishedAt: "", label: "SOC 2 TYPE II", code: "SOC-2", icon: null, badge: null, order: 2 },
  { id: 3, documentId: "cert-3", createdAt: "", updatedAt: "", publishedAt: "", label: "ZERO-TRUST NATIVO", code: "Z-TRUST", icon: null, badge: null, order: 3 },
  { id: 4, documentId: "cert-4", createdAt: "", updatedAt: "", publishedAt: "", label: "OWASP TOP 10 HARDENING", code: "OWASP", icon: null, badge: null, order: 4 },
  { id: 5, documentId: "cert-5", createdAt: "", updatedAt: "", publishedAt: "", label: "NIST FRAMEWORK", code: "NIST", icon: null, badge: null, order: 5 },
];

export default function SecurityServices({
  hero,
  certificationsTitle,
  certifications,
  heading,
  services,
  lifecycleHeading,
  methodologySteps,
}: {
  hero?: CmsHero | null;
  certificationsTitle?: string | null;
  certifications?: Certification[];
  heading?: CmsSectionHeading | null;
  services?: Service[];
  lifecycleHeading?: CmsSectionHeading | null;
  methodologySteps?: MethodologyStep[];
}) {
  const eyebrow = hero?.eyebrow ?? "Ciberseguridad Empresarial";
  const title =
    hero?.title ?? "Protección Sin Concesiones para Infraestructuras Críticas.";
  const description =
    hero?.description ??
    "Monitoreo avanzado de amenazas, auditorías de seguridad quirúrgicas y protocolos de protección de datos de grado militar diseñados para entornos de alta exigencia.";
  const primaryLink = hero?.primaryLink ?? {
    label: "Solicitar Auditoría",
    href: "/contacto",
    variant: "primary" as const,
  };
  const secondaryLink = hero?.secondaryLink ?? {
    label: "Ver Informe Técnico",
    href: "/seguridad",
    variant: "secondary" as const,
  };

  const certTitle =
    certificationsTitle ?? "Estándares de Cumplimiento & Certificaciones";
  const certList =
    certifications && certifications.length > 0
      ? certifications
      : defaultCertifications;

  const defenseEyebrow = heading?.eyebrow ?? "Defensa Integral";
  const defenseTitle = heading?.title ?? "Mecanismos Principales de Defensa";
  const defenseDescription =
    heading?.description ??
    "Arquitectura de capas múltiples diseñada para prevenir, detectar y neutralizar vectores de ataque antes de que impacten la continuidad operativa.";

  const lifecycleEyebrow = lifecycleHeading?.eyebrow ?? "Proceso de Endurecimiento";
  const lifecycleTitle =
    lifecycleHeading?.title ?? "Ciclo de Vida de Seguridad Defensiva";
  const lifecycleDescription =
    lifecycleHeading?.description ??
    "Cómo aseguramos que cada capa de tu infraestructura sea impenetrable y resiliente.";

  const serviceList = services ?? [];
  const stepsList = methodologySteps ?? [];

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
              {eyebrow}
            </div>

            <h2 className="font-headline text-4xl font-black tracking-tight text-black sm:text-5xl lg:text-6xl">
              {title}
            </h2>

            <p className="mt-6 max-w-2xl font-body text-base text-black sm:text-lg leading-relaxed">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {primaryLink && (
                <Link
                  href={primaryLink.href}
                  className="rounded-xl bg-primary px-6 py-3 font-body text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  {primaryLink.label}
                </Link>
              )}
              {secondaryLink && (
                <Link
                  href={secondaryLink.href}
                  className="rounded-xl border border-neutral bg-white px-6 py-3 font-body text-sm font-semibold text-black transition-colors hover:bg-neutral/60"
                >
                  {secondaryLink.label}
                </Link>
              )}
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
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
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
          {certTitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {certList.map((item) => (
            <div
              key={item.id || item.code}
              className="flex items-center gap-2 rounded-xl border border-neutral bg-white px-4 py-2 shadow-xs"
            >
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
            {defenseEyebrow}
          </div>
          <h3 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl">
            {defenseTitle}
          </h3>
          {defenseDescription && (
            <p className="mt-3 max-w-2xl font-body text-base text-black">
              {defenseDescription}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serviceList.map((service) => {
            const isTerminalMockup =
              service.slug === "monitoreo-continuo" ||
              service.features?.some((f) => f.marker === ">");
            const hasFeatureDescriptions = service.features?.some(
              (f) => f.description !== null && f.description !== "",
            );

            return (
              <div
                key={service.id || service.slug}
                id={service.anchor ?? undefined}
                className={`group rounded-2xl border border-neutral ${
                  service.slug === "monitoreo-continuo" ? "bg-neutral/30" : "bg-white"
                } p-8 shadow-sm transition-all duration-300 ${
                  ACCENT_HOVER_BORDER[service.accent]
                } hover:shadow-md ${LAYOUT[service.layout]}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        ACCENT_BADGE[service.accent]
                      } transition-transform group-hover:scale-110`}
                    >
                      <Icon name={service.icon} className="h-6 w-6" />
                    </div>
                    {service.badge && (
                      <span
                        className={`rounded-full ${
                          service.accent === "primary"
                            ? "bg-primary/10 text-primary"
                            : "bg-neutral text-black"
                        } px-3 py-1 font-label text-xs font-semibold`}
                      >
                        {service.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-headline text-xl font-bold text-black mb-3">
                    {service.title}
                  </h4>
                  <p
                    className={`font-body text-sm text-black leading-relaxed ${
                      service.layout === "wide" ? "max-w-2xl" : "mb-6"
                    }`}
                  >
                    {service.description}
                  </p>
                </div>

                {/* Terminal Mockup (Monitoreo Continuo) */}
                {isTerminalMockup && (
                  <div className="rounded-xl border border-neutral bg-white p-4 font-label text-xs space-y-1 shadow-inner">
                    {service.features && service.features.length > 0 ? (
                      service.features.map((feature, idx) => (
                        <div
                          key={feature.id || idx}
                          className={`${ACCENT_TEXT[feature.accent]} ${
                            feature.accent === "primary" ? "font-bold" : ""
                          }`}
                        >
                          {feature.marker} {feature.label}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="text-primary font-bold">&gt; _SOC_RADAR: ACTIVO</div>
                        <div className="text-black">TRAFFIC_HEALTH: 100%</div>
                        <div className="text-secondary font-semibold">
                          ANOMALIES_DETECTED: 0
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Features with descriptions (Auditorías) */}
                {!isTerminalMockup &&
                  service.features &&
                  service.features.length > 0 &&
                  hasFeatureDescriptions && (
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-neutral pt-6">
                      {service.features.map((feature, idx) => (
                        <div key={feature.id || idx} className="flex items-start gap-2">
                          {feature.marker && (
                            <span
                              className={`font-label text-xs font-bold ${
                                ACCENT_TEXT[feature.accent]
                              }`}
                            >
                              {feature.marker}
                            </span>
                          )}
                          <div>
                            <h5 className="font-headline text-sm font-semibold text-black">
                              {feature.label}
                            </h5>
                            {feature.description && (
                              <p className="font-body text-xs text-black">
                                {feature.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Badge at bottom (Protección de datos) */}
                {!isTerminalMockup &&
                  (!service.features || service.features.length === 0) &&
                  (!service.tags || service.tags.length === 0) &&
                  service.badge && (
                    <div className="mt-6 border-t border-neutral pt-4 font-label text-xs text-black">
                      {service.badge}
                    </div>
                  )}

                {/* Tags (Respuesta a incidentes) */}
                {service.tags && service.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {service.tags.map((tag, idx) => (
                      <span
                        key={tag.id || idx}
                        className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Security Methodology / Lifecycle */}
      <section className="rounded-3xl border border-neutral bg-neutral/30 p-8 sm:p-12">
        <div className="mb-10 text-center">
          <span className="font-label text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block">
            {lifecycleEyebrow}
          </span>
          <h3 className="font-headline text-2xl font-bold text-black sm:text-3xl">
            {lifecycleTitle}
          </h3>
          {lifecycleDescription && (
            <p className="mx-auto mt-2 max-w-xl font-body text-sm text-black sm:text-base">
              {lifecycleDescription}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stepsList.map((step) => (
            <div
              key={step.id || step.stepNumber}
              className="rounded-2xl border border-neutral bg-white p-6 shadow-sm"
            >
              <div
                className={`font-headline text-2xl font-black ${
                  ACCENT_TEXT[step.accent]
                } mb-2`}
              >
                {step.stepNumber}
              </div>
              <h4 className="font-headline text-base font-bold text-black mb-2">
                {step.title}
              </h4>
              <p className="font-body text-xs text-black leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
