import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Política de Privacidad | Itc Services",
  description:
    "Conoce cómo Itc Services recopila, protege y gestiona la información y datos corporativos bajo estándares estrictos de confidencialidad y seguridad.",
};

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            Legal & Cumplimiento
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
            Política de Privacidad
          </h1>
          <p className="font-label text-xs text-black">
            Última actualización: Agosto 2026
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 font-body text-base text-black leading-relaxed">
          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              1. Compromiso con la Seguridad y Privacidad
            </h2>
            <p>
              En <strong>Itc Services</strong>, la confidencialidad, integridad y disponibilidad de la información de nuestros clientes y usuarios son prioridades fundamentales. Esta política describe cómo gestionamos los datos recopilados a través de nuestras plataformas y servicios de desarrollo de software.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              2. Recopilación de Información
            </h2>
            <p>
              Recopilamos únicamente los datos necesarios para brindar nuestros servicios de consultoría, desarrollo e ingeniería tecnológica:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Datos de contacto:</strong> Nombre, correo electrónico corporativo, empresa y número telefónico proporcionados voluntariamente.</li>
              <li><strong>Datos técnicos de proyectos:</strong> Requerimientos de arquitectura, documentación técnica y especificaciones provistas para fines de estimación y desarrollo.</li>
              <li><strong>Datos de navegación:</strong> Métricas anónimas de rendimiento y navegación para optimizar la experiencia en nuestro portal.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              3. Principios de Zero-Trust y Protección de Datos
            </h2>
            <p>
              Implementamos rigurosos controles de acceso bajo modelos de arquitectura Zero-Trust, cifrado de extremo a extremo (TLS 1.3 y AES-256) y revisiones continuas de seguridad para garantizar que la información sensible no sea comprometida.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-black mb-3">
              4. Contacto de Privacidad
            </h2>
            <p>
              Para cualquier consulta sobre el tratamiento de tus datos o ejercer tus derechos de acceso y rectificación, puedes comunicarte con nuestro equipo en{" "}
              <Link href="/contacto" className="text-primary font-semibold hover:underline">
                contacto@itcservices.com
              </Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
