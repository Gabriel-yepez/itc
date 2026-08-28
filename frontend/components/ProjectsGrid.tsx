import Link from "next/link";

interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  tags: string[];
  metrics: { label: string; value: string };
  gradient: string;
  icon: string;
}

const projects: Project[] = [
  {
    id: "apex-nexus",
    title: "Apex Nexus",
    subtitle: "Modernización de Infraestructura Bancaria",
    category: "Infraestructura & Zero-Trust",
    description:
      "Transformación integral de arquitectura financiera monolítica hacia un modelo distribuido Zero-Trust de alto rendimiento. Reducción de la superficie de vulnerabilidad en un 94% en un periodo de despliegue de 6 meses.",
    tags: ["Zero-Trust", "Kubernetes", "Go", "Next.js"],
    metrics: { label: "Reducción de Riesgos", value: "94%" },
    gradient: "from-primary/20 via-primary/5 to-transparent",
    icon: "shield",
  },
  {
    id: "sentinel-wall",
    title: "Sentinel Wall",
    subtitle: "Detección de Amenazas en Tiempo Real",
    category: "Inteligencia Artificial & Defensa",
    description:
      "Implementación de modelado predictivo de amenazas con detección de anomalías asistida por IA para infraestructura crítica distribuida a lo largo de 40 nodos globales.",
    tags: ["Machine Learning", "Python", "AWS Edge", "Microservicios"],
    metrics: { label: "Nodos Monitoreados", value: "40+ Nodos" },
    gradient: "from-secondary/20 via-secondary/5 to-transparent",
    icon: "analytics",
  },
  {
    id: "vita-vault",
    title: "Vita Vault",
    subtitle: "Pipeline Criptográfico de Salud",
    category: "Criptografía & Sector Salud",
    description:
      "Diseño e implementación de arquitectura de cifrado de extremo a extremo para registros médicos, garantizando estricto cumplimiento normativo HIPAA y reduciendo la latencia de consulta en un 40%.",
    tags: ["Criptografía", "Rust", "PostgreSQL", "HIPAA"],
    metrics: { label: "Latencia de Consulta", value: "-40%" },
    gradient: "from-tertiary/20 via-tertiary/5 to-transparent",
    icon: "lock",
  },
  {
    id: "cloud-anchor",
    title: "Cloud Anchor",
    subtitle: "Resiliencia Multi-Cloud para E-Commerce",
    category: "Cloud & Alta Disponibilidad",
    description:
      "Estrategia de migración multi-cloud y mitigación proactiva contra ataques DDoS para plataforma de comercio masivo, asegurando cero caídas durante eventos de tráfico pico.",
    tags: ["Cloudflare", "Terraform", "GCP", "Docker"],
    metrics: { label: "Disponibilidad", value: "99.999%" },
    gradient: "from-primary/20 via-tertiary/5 to-transparent",
    icon: "cloud",
  },
  {
    id: "omnipay-mobile",
    title: "OmniPay Mobile",
    subtitle: "Billetera Digital y Pagos Biométricos",
    category: "Desarrollo Móvil",
    description:
      "Aplicación transaccional multiplataforma de pagos y billetera digital con autenticación biométrica multifactor, enclave seguro de llaves y sincronización offline instantánea.",
    tags: ["React Native", "Swift", "Kotlin", "Biometría"],
    metrics: { label: "Valoración App Stores", value: "4.9 ★" },
    gradient: "from-secondary/20 via-primary/5 to-transparent",
    icon: "mobile",
  },
  {
    id: "datapulse-analytics",
    title: "DataPulse Analytics",
    subtitle: "Centro de Mando de Telemetría",
    category: "Big Data & Observabilidad",
    description:
      "Plataforma de procesamiento de datos en tiempo real y centro de comando visual capaz de ingerir y analizar millones de eventos por segundo con tableros de máxima densidad.",
    tags: ["ClickHouse", "GraphQL", "Tailwind CSS", "TypeScript"],
    metrics: { label: "Eventos Procesados", value: "+10M / seg" },
    gradient: "from-tertiary/20 via-secondary/5 to-transparent",
    icon: "chart",
  },
];

export default function ProjectsGrid() {
  return (
    <section className="w-full py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.id}
            className="group flex flex-col justify-between rounded-2xl border border-neutral bg-white shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg overflow-hidden"
          >
            <div>
              {/* Header Visual Box */}
              <div
                className={`relative h-44 w-full bg-gradient-to-br ${project.gradient} border-b border-neutral flex items-center justify-center p-6 overflow-hidden`}
              >
                {/* Background Tech Pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="font-label text-xs font-semibold uppercase tracking-wider text-black bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-neutral shadow-xs">
                    {project.category}
                  </span>
                  <span className="mt-3 font-headline text-2xl font-black text-black">
                    {project.title}
                  </span>
                </div>

                {/* Metric Badge */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm border border-neutral rounded-lg px-2.5 py-1 font-label text-[11px] font-bold text-black shadow-xs">
                  {project.metrics.value}
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6">
                <h3 className="font-headline text-lg font-bold text-black mb-2">
                  {project.subtitle}
                </h3>
                <p className="font-body text-sm text-black leading-relaxed mb-6">
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-neutral bg-neutral/60 px-2.5 py-1 font-label text-[11px] font-medium text-black"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="border-t border-neutral p-6 pt-4">
              <Link
                href="/contacto"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral bg-white py-2.5 font-body text-sm font-semibold text-black transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                Consultar Solución Similar
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
