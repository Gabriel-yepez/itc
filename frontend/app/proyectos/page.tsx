import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProjectsGrid from "@/components/ProjectsGrid";
import { seo } from "@/lib/seo";

export const metadata: Metadata = {
  title: seo.pages.proyectos.title,
  description: seo.pages.proyectos.description,
  keywords: seo.pages.proyectos.keywords,
  alternates: {
    canonical: "/proyectos",
  },
  openGraph: {
    ...seo.openGraph,
    ...seo.pages.proyectos.openGraph,
  },
  twitter: {
    ...seo.twitter,
    title: seo.pages.proyectos.title,
    description: seo.pages.proyectos.description,
  },
};

export default function ProyectosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        {/* Header Section */}
        <section className="mb-12 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-primary mb-4">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Portafolio & Casos de Éxito
          </div>
          <h1 className="font-headline text-4xl font-black tracking-tight text-black sm:text-5xl lg:text-6xl">
            Proyectos Destacados
          </h1>
          <p className="mt-4 max-w-3xl font-body text-base text-black sm:text-lg">
            Una selección de nuestros despliegues más complejos en ingeniería de software, arquitectura de sistemas y endurecimiento de infraestructura para entornos corporativos de alta demanda.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-neutral bg-neutral/30 p-6 sm:grid-cols-4">
            <div>
              <div className="font-headline text-2xl font-bold text-black sm:text-3xl">
                +100
              </div>
              <div className="font-label text-xs text-black">
                Proyectos Entregados
              </div>
            </div>
            <div>
              <div className="font-headline text-2xl font-bold text-black sm:text-3xl">
                99.99%
              </div>
              <div className="font-label text-xs text-black">
                Uptime Garantizado
              </div>
            </div>
            <div>
              <div className="font-headline text-2xl font-bold text-black sm:text-3xl">
                Zero-Trust
              </div>
              <div className="font-label text-xs text-black">
                Arquitectura Nativa
              </div>
            </div>
            <div>
              <div className="font-headline text-2xl font-bold text-black sm:text-3xl">
                10+ Años
              </div>
              <div className="font-label text-xs text-black">
                Experiencia Técnica
              </div>
            </div>
          </div>
        </section>

        {/* Projects Cards Grid */}
        <ProjectsGrid />

        {/* CTA Section */}
        <section className="my-16 rounded-3xl border border-neutral bg-neutral/40 p-8 sm:p-12 text-center flex flex-col items-center">
          <span className="font-label text-xs font-semibold uppercase tracking-wider text-secondary bg-secondary/10 px-3 py-1 rounded-full mb-4">
            Comencemos Hoy
          </span>
          <h2 className="font-headline text-2xl font-bold text-black sm:text-3xl lg:text-4xl max-w-xl">
            ¿Tienes un desafío técnico o proyecto que deseas construir?
          </h2>
          <p className="mt-4 max-w-lg font-body text-sm text-black sm:text-base">
            Diseñamos soluciones personalizadas que combinan precisión de ingeniería, arquitectura moderna y seguridad de primer nivel.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/contacto"
              className="rounded-xl bg-primary px-6 py-3 font-body text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Solicitar Propuesta
            </Link>
            <Link
              href="/servicios"
              className="rounded-xl border border-neutral bg-white px-6 py-3 font-body text-sm font-semibold text-black transition-colors hover:bg-neutral/60"
            >
              Explorar Servicios
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
