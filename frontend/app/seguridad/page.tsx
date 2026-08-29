import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Auditoría de Seguridad & Zero-Trust | Itc Services",
  description:
    "Descubre las prácticas de seguridad, certificaciones y auditorías de código de Itc Services diseñadas para entornos empresariales de máxima confidencialidad.",
};

export default function SeguridadPage() {
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
            Seguridad & Cumplimiento
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
            Auditoría de Seguridad & Enfoque Zero-Trust
          </h1>
          <p className="font-body text-base text-black sm:text-lg max-w-3xl leading-relaxed">
            La seguridad no es un añadido posterior en nuestros proyectos: es el pilar central de nuestra arquitectura desde el diseño inicial hasta el despliegue en producción.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="rounded-2xl border border-neutral bg-neutral/20 p-6">
            <div className="font-headline text-xl font-bold text-primary mb-2">Zero-Trust</div>
            <p className="font-body text-sm text-black">
              Principio de mínimo privilegio, autenticación continua y segmentación estricta en cada capa de la red.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral bg-neutral/20 p-6">
            <div className="font-headline text-xl font-bold text-secondary mb-2">DevSecOps Nativo</div>
            <p className="font-body text-sm text-black">
              Análisis estático (SAST), análisis dinámico (DAST) y escaneo continuo de dependencias en CI/CD.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral bg-neutral/20 p-6">
            <div className="font-headline text-xl font-bold text-tertiary mb-2">Cifrado de Extremo a Extremo</div>
            <p className="font-body text-sm text-black">
              Protección de datos en tránsito (TLS 1.3) y en reposo (AES-256) con gestión granular de claves.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral bg-neutral/40 p-8 sm:p-12 text-center flex flex-col items-center">
          <h2 className="font-headline text-2xl font-bold text-black sm:text-3xl max-w-xl mb-4">
            ¿Requieres una auditoría de seguridad o pentesting?
          </h2>
          <p className="font-body text-base text-black max-w-lg mb-8">
            Nuestros especialistas en ciberseguridad pueden evaluar tu arquitectura actual y formular un plan de endurecimiento técnico.
          </p>
          <Link
            href="/contacto"
            className="rounded-xl bg-primary px-8 py-3.5 font-body text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
          >
            Solicitar Auditoría
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
