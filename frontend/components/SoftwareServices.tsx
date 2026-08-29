import Link from "next/link";
import DevelopmentMethodology from "@/components/DevelopmentMethodology";
import DevelopmentServices from "@/components/DevelopmentServices";
import { Icon } from "@/components/icons";
import type {
  CmsHero,
  CmsSectionHeading,
  MethodologyStep,
  Service,
} from "@/lib/cms/types";

export default function SoftwareServices({
  hero,
  heading,
  services,
  methodologyHeading,
  methodologySteps,
}: {
  hero?: CmsHero | null;
  heading?: CmsSectionHeading | null;
  services?: Service[];
  methodologyHeading?: CmsSectionHeading | null;
  methodologySteps?: MethodologyStep[];
}) {
  const eyebrow = hero?.eyebrow ?? "Excelencia en Ingeniería";
  const title = hero?.title ?? "Ingeniería de Software de Precisión para Escalar.";
  const description =
    hero?.description ??
    "Diseñamos, construimos y desplegamos aplicaciones de alto rendimiento con seguridad integrada en cada capa. Desde robustas arquitecturas cloud hasta experiencias móviles fluidas.";
  const primaryLink = hero?.primaryLink ?? {
    label: "Solicitar Cotización",
    href: "/contacto",
    variant: "primary" as const,
  };
  const secondaryLink = hero?.secondaryLink ?? {
    label: "Ver Casos de Estudio",
    href: "/proyectos",
    variant: "secondary" as const,
  };
  const panelTitle = hero?.panelTitle ?? "Infraestructura & Software";
  const panelDescription =
    hero?.panelDescription ??
    "Arquitecturas distribuidas, Zero-Trust nativo y desarrollo de ciclo completo.";
  const panelIcon = hero?.panelIcon ?? "code";

  return (
    <div className="w-full space-y-16">
      {/* Header Hero Section */}
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
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
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
            <div className="relative aspect-4/3 w-full rounded-2xl border border-neutral bg-neutral/50 p-8 flex flex-col justify-center items-center text-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
                  <Icon name={panelIcon} className="h-8 w-8" />
                </div>
                <span className="font-headline text-xl font-bold text-black">
                  {panelTitle}
                </span>
                <span className="mt-2 font-label text-xs text-black max-w-xs">
                  {panelDescription}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Development Services Bento Grid */}
      <DevelopmentServices heading={heading} services={services} />

      {/* Development Methodology */}
      <DevelopmentMethodology heading={methodologyHeading} steps={methodologySteps} />
    </div>
  );
}
