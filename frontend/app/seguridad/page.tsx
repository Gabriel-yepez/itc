import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { buildMetadata } from "@/lib/cms/metadata";
import { ACCENT_TEXT } from "@/lib/cms/presentation";
import { getSecurityPage } from "@/lib/cms/queries";
import type { CmsFeature } from "@/lib/cms/types";

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:security-page");
  const page = await getSecurityPage();
  return buildMetadata(page?.seo ?? null, "/seguridad");
}

const defaultPillars: CmsFeature[] = [
  {
    id: 1,
    label: "Zero-Trust",
    description:
      "Principio de mínimo privilegio, autenticación continua y segmentación estricta en cada capa de la red.",
    marker: null,
    accent: "primary",
  },
  {
    id: 2,
    label: "DevSecOps Nativo",
    description:
      "Análisis estático (SAST), análisis dinámico (DAST) y escaneo continuo de dependencias en CI/CD.",
    marker: null,
    accent: "secondary",
  },
  {
    id: 3,
    label: "Cifrado de Extremo a Extremo",
    description:
      "Protección de datos en tránsito (TLS 1.3) y en reposo (AES-256) con gestión granular de claves.",
    marker: null,
    accent: "tertiary",
  },
];

export default async function SeguridadPage() {
  const securityPage = await getSecurityPage();

  const heading = securityPage?.heading;
  const eyebrow = heading?.eyebrow ?? "Seguridad & Cumplimiento";
  const title =
    heading?.title ?? "Auditoría de Seguridad & Enfoque Zero-Trust";
  const description =
    heading?.description ??
    "La seguridad no es un añadido posterior en nuestros proyectos: es el pilar central de nuestra arquitectura desde el diseño inicial hasta el despliegue en producción.";

  const pillars =
    securityPage?.pillars && securityPage.pillars.length > 0
      ? securityPage.pillars
      : defaultPillars;

  const cta = securityPage?.cta;
  const ctaTitle =
    cta?.title ?? "¿Requieres una auditoría de seguridad o pentesting?";
  const ctaDescription =
    cta?.description ??
    "Nuestros especialistas en ciberseguridad pueden evaluar tu arquitectura actual y formular un plan de endurecimiento técnico.";
  const primaryLink = cta?.primaryLink ?? {
    label: "Solicitar Auditoría",
    href: "/contacto",
    variant: "primary" as const,
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-12 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            {eyebrow}
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
            {title}
          </h1>
          <p className="font-body text-base text-black sm:text-lg max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {pillars.map((pillar, idx) => (
            <div
              key={pillar.id || idx}
              className="rounded-2xl border border-neutral bg-neutral/20 p-6"
            >
              <div
                className={`font-headline text-xl font-bold ${
                  ACCENT_TEXT[pillar.accent]
                } mb-2`}
              >
                {pillar.label}
              </div>
              {pillar.description && (
                <p className="font-body text-sm text-black">
                  {pillar.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-neutral bg-neutral/40 p-8 sm:p-12 text-center flex flex-col items-center">
          <h2 className="font-headline text-2xl font-bold text-black sm:text-3xl max-w-xl mb-4">
            {ctaTitle}
          </h2>
          <p className="font-body text-base text-black max-w-lg mb-8">
            {ctaDescription}
          </p>
          {primaryLink && (
            <Link
              href={primaryLink.href}
              className="rounded-xl bg-primary px-8 py-3.5 font-body text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
            >
              {primaryLink.label}
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
