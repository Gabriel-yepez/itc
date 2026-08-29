import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ServicesTabs from "@/components/ServicesTabs";
import { seo } from "@/lib/seo";

export const metadata: Metadata = {
  title: seo.pages.servicios.title,
  description: seo.pages.servicios.description,
  keywords: seo.pages.servicios.keywords,
  alternates: {
    canonical: "/servicios",
  },
  openGraph: {
    ...seo.openGraph,
    ...seo.pages.servicios.openGraph,
  },
  twitter: {
    ...seo.twitter,
    title: seo.pages.servicios.title,
    description: seo.pages.servicios.description,
  },
};

export default function ServiciosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        {/* Headless UI Tabbed Services */}
        <ServicesTabs />

        {/* Bottom CTA */}
        <section className="my-16 rounded-3xl border border-neutral bg-neutral/40 p-8 sm:p-12 text-center flex flex-col items-center">
          <span className="font-label text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
            Iniciemos Tu Proyecto
          </span>
          <h2 className="font-headline text-2xl font-bold text-black sm:text-3xl lg:text-4xl max-w-xl">
            ¿Listo para construir o asegurar infraestructura de clase mundial?
          </h2>
          <p className="mt-4 max-w-lg font-body text-sm text-black sm:text-base">
            Cuéntanos tus requerimientos y nuestro equipo de arquitectos, desarrolladores y especialistas en ciberseguridad diseñará la solución ideal.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/contacto"
              className="rounded-xl bg-primary px-6 py-3 font-body text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Contactar Especialista
            </Link>
            <Link
              href="/proyectos"
              className="rounded-xl border border-neutral bg-white px-6 py-3 font-body text-sm font-semibold text-black transition-colors hover:bg-neutral/60"
            >
              Ver Casos de Éxito
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
