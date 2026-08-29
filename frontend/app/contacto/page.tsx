import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { buildMetadata } from "@/lib/cms/metadata";
import { getContactPage } from "@/lib/cms/queries";

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:contact-page");
  const page = await getContactPage();
  return buildMetadata(page?.seo ?? null, "/contacto");
}

export default async function ContactoPage() {
  const contactPage = await getContactPage();

  const heading = contactPage?.heading;
  const eyebrow = heading?.eyebrow ?? "Ponte en Contacto";
  const title = heading?.title ?? "Hablemos de tu Próximo Desafío";
  const description =
    heading?.description ??
    "Nuestros arquitectos de software y especialistas en seguridad están listos para colaborar contigo. Completa el formulario y te responderemos con precisión técnica.";

  const office = contactPage?.office;
  const channel = contactPage?.channel;

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left Column: Form Section */}
          <section className="flex flex-col">
            <div className="mb-8">
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {eyebrow}
              </div>
              <h1 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
                {title}
              </h1>
              <p className="font-body text-base text-black sm:text-lg leading-relaxed">
                {description}
              </p>
            </div>

            <ContactForm
              inquiryOptions={contactPage?.inquiryOptions}
              submitLabel={contactPage?.submitLabel}
              successTitle={contactPage?.successTitle}
              successMessage={contactPage?.successMessage}
            />
          </section>

          {/* Right Column: Info Cards & Map/Tech Visualization */}
          <section className="flex flex-col space-y-6">
            {/* Contact Info Cards Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location Card */}
              <div className="rounded-2xl border border-neutral bg-neutral/30 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h2 className="font-label text-xs font-bold uppercase tracking-wider text-black mb-2">
                  {office?.label ?? "Sede Central"}
                </h2>
                <div className="font-body text-sm text-black space-y-1">
                  <p>{office?.addressLine1 ?? "100 Cyber Way, Suite 500"}</p>
                  {office?.addressLine2 && <p>{office.addressLine2}</p>}
                  {office?.note && (
                    <p className="font-label text-xs text-black">{office.note}</p>
                  )}
                </div>
              </div>

              {/* Direct Line Card */}
              <div className="rounded-2xl border border-neutral bg-neutral/30 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <h2 className="font-label text-xs font-bold uppercase tracking-wider text-black mb-2">
                  {channel?.label ?? "Contacto Directo"}
                </h2>
                <div className="font-body text-sm text-black space-y-1">
                  {channel?.phone && <p className="font-semibold">{channel.phone}</p>}
                  {channel?.email && <p>{channel.email}</p>}
                  {channel?.hours && (
                    <p className="font-label text-xs text-black">{channel.hours}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative Tech / Map Card */}
            <div className="relative min-h-[320px] w-full rounded-2xl border border-neutral bg-neutral/20 overflow-hidden flex flex-col justify-between p-6 shadow-sm">
              {/* Isometric Map Background Pattern */}
              <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Tech Schematic Elements */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary/40" />
                  <div className="h-3 w-3 rounded-full bg-secondary/40" />
                  <div className="h-3 w-3 rounded-full bg-tertiary/40" />
                  <span className="font-label text-xs text-black ml-2 font-bold">
                    RED GLOBAL DE INGENIERÍA
                  </span>
                </div>
                <span className="font-label text-xs font-bold text-black border border-neutral px-2.5 py-1 rounded-md bg-white">
                  SOC 2 TYPE II
                </span>
              </div>

              {/* Central Abstract Topology */}
              <div className="relative z-10 flex flex-col items-center justify-center my-8">
                <div className="relative flex items-center justify-center">
                  <div className="h-28 w-28 rounded-full border border-dashed border-primary/40 animate-[spin_30s_linear_infinite]" />
                  <div className="absolute h-18 w-18 rounded-full border border-secondary/40 animate-[spin_20s_linear_infinite_reverse]" />
                  <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <span className="font-label text-xs text-black mt-3 font-semibold tracking-wide">
                  LATENCIA &lt; 20ms | COBERTURA MULTI-CLOUD
                </span>
              </div>

              {/* Status Chip Footer */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-neutral/60 pt-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-3 py-1 font-label text-xs font-bold uppercase tracking-wider text-secondary border border-secondary/20">
                  <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                  Sistemas Operativos 100%
                </div>
                <span className="font-label text-xs text-black font-medium">
                  SLA Garantizado 99.99%
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
