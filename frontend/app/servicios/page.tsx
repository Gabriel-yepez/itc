import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ServicesTabs from "@/components/ServicesTabs";
import { buildMetadata } from "@/lib/cms/metadata";
import {
  getCertifications,
  getMethodologySteps,
  getServices,
  getServicesPage,
} from "@/lib/cms/queries";

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services-page");
  const page = await getServicesPage();
  return buildMetadata(page?.seo ?? null, "/servicios");
}

export default async function ServiciosPage() {
  const [
    servicesPage,
    softwareServices,
    securityServices,
    devMethodologySteps,
    securityMethodologySteps,
    certifications,
  ] = await Promise.all([
    getServicesPage(),
    getServices("software"),
    getServices("security"),
    getMethodologySteps("development"),
    getMethodologySteps("security"),
    getCertifications(),
  ]);

  const cta = servicesPage?.cta;
  const ctaEyebrow = cta?.eyebrow ?? "Iniciemos Tu Proyecto";
  const ctaTitle =
    cta?.title ?? "¿Listo para construir o asegurar infraestructura de clase mundial?";
  const ctaDescription =
    cta?.description ??
    "Cuéntanos tus requerimientos y nuestro equipo de arquitectos, desarrolladores y especialistas en ciberseguridad diseñará la solución ideal.";
  const primaryLink = cta?.primaryLink ?? {
    label: "Contactar Especialista",
    href: "/contacto",
    variant: "primary" as const,
  };
  const secondaryLink = cta?.secondaryLink ?? {
    label: "Ver Casos de Éxito",
    href: "/proyectos",
    variant: "secondary" as const,
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        {/* Headless UI Tabbed Services */}
        <ServicesTabs
          servicesPage={servicesPage}
          softwareServices={softwareServices}
          securityServices={securityServices}
          devMethodologySteps={devMethodologySteps}
          securityMethodologySteps={securityMethodologySteps}
          certifications={certifications}
        />

        {/* Bottom CTA */}
        <section className="my-16 rounded-3xl border border-neutral bg-neutral/40 p-8 sm:p-12 text-center flex flex-col items-center">
          <span className="font-label text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
            {ctaEyebrow}
          </span>
          <h2 className="font-headline text-2xl font-bold text-black sm:text-3xl lg:text-4xl max-w-xl">
            {ctaTitle}
          </h2>
          <p className="mt-4 max-w-lg font-body text-sm text-black sm:text-base">
            {ctaDescription}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
