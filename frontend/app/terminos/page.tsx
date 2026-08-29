import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Términos de Servicio | Itc Services",
  description:
    "Términos y condiciones para la contratación de servicios de desarrollo de software, arquitectura cloud y consultoría tecnológica de Itc Services.",
};

export default function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-secondary mb-4">
            Legal & Acuerdos
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
            Términos de Servicio
          </h1>
          <p className="font-label text-xs text-black">
            Última actualización: Agosto 2026
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 font-body text-base text-black leading-relaxed">
          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              1. Aceptación de Términos
            </h2>
            <p>
              Al acceder a nuestro sitio web o contratar los servicios de ingeniería de software provistos por <strong>Itc Services</strong>, usted acepta estar sujeto a estos términos y condiciones, así como a los Acuerdos de Nivel de Servicio (SLA) específicos de cada contrato comercial.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              2. Alcance de los Servicios
            </h2>
            <p>
              Itc Services presta servicios profesionales de desarrollo de aplicaciones web y móviles, ingeniería de datos, arquitectura cloud, consultoría DevSecOps y auditoría de seguridad informática bajo especificaciones acordadas en cada propuesta técnica.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              3. Propiedad Intelectual
            </h2>
            <p>
              Salvo acuerdo expreso en contrario, todos los entregables desarrollados a la medida pasan a ser propiedad exclusiva del cliente una vez satisfechas las obligaciones contractuales correspondientes.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              4. Consultas Legales
            </h2>
            <p>
              Para más información sobre nuestros términos contractuales, por favor{" "}
              <Link href="/contacto" className="text-primary font-semibold hover:underline">
                contáctanos aquí
              </Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
