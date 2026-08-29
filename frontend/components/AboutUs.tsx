import { ACCENT_TEXT } from "@/lib/cms/presentation";
import type { HomePage } from "@/lib/cms/types";

export default function AboutUs({ about }: { about?: HomePage["about"] }) {
  const eyebrow = about?.eyebrow ?? "Quiénes Somos";
  const title = about?.title ?? "Ingeniería de Software con Propósito y Precisión";
  const anchor = about?.anchor ?? "quienes-somos";
  const bodyText =
    about?.body ??
    "Somos una firma de ingeniería de software especializada en resolver problemas complejos de negocio mediante tecnología de vanguardia. Nuestro equipo de arquitectos, desarrolladores y expertos en seguridad trabaja como una extensión de tu organización.\n\nNos alejamos de las soluciones genéricas. Construimos plataformas escalables, infraestructuras resilientes y aplicaciones de alto rendimiento diseñadas meticulosamente para las necesidades específicas de tu empresa, garantizando la seguridad (Zero-Trust) desde la primera línea de código.";

  const paragraphs = bodyText.split("\n\n").filter(Boolean);

  const stats = about?.stats && about.stats.length > 0 ? about.stats : [
    { id: 1, value: "10+", label: "Años de Experiencia", accent: "primary" as const },
    { id: 2, value: "100%", label: "Compromiso con la Calidad", accent: "secondary" as const },
  ];

  return (
    <section className="w-full py-16 sm:py-24 border-t border-neutral" id={anchor}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
        <div>
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {eyebrow}
          </div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl mb-6">
            {title}
          </h2>
          <div className="font-body text-base text-black sm:text-lg leading-relaxed space-y-4">
            {paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-neutral pt-8">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <div className={`font-headline text-3xl font-black ${ACCENT_TEXT[stat.accent]}`}>
                  {stat.value}
                </div>
                <div className="font-label text-xs font-semibold uppercase text-black mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral/30 border border-neutral/50 flex items-center justify-center shadow-inner">
          {/* Decorative tech abstract pattern representing a team / network */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="relative z-10 w-3/4 h-3/4 rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm flex items-center justify-center animate-[spin_60s_linear_infinite]">
            <div className="w-3/4 h-3/4 rounded-full border border-secondary/30 flex items-center justify-center animate-[spin_40s_linear_infinite_reverse]">
              <div className="w-1/2 h-1/2 rounded-full border border-tertiary/40 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
