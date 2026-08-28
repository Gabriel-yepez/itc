export default function DevelopmentMethodology() {
  const steps = [
    {
      number: "01",
      title: "Descubrimiento & Arquitectura",
      description:
        "Levantamiento de requerimientos, viabilidad técnica, modelado de datos y diseño del blueprint de arquitectura.",
      color: "bg-primary/10 text-primary border-primary/20",
    },
    {
      number: "02",
      title: "Construcción Iterativa",
      description:
        "Sprints ágiles con integración continua, testing automatizado y entregas funcionales frecuentes.",
      color: "bg-tertiary/10 text-tertiary border-tertiary/20",
    },
    {
      number: "03",
      title: "Auditoría de Seguridad",
      description:
        "Pruebas de penetración rigurosas, escaneo estático/dinámico de código y evaluación exhaustiva de vulnerabilidades.",
      color: "bg-secondary/10 text-secondary border-secondary/20",
    },
    {
      number: "04",
      title: "Despliegue & Escalabilidad",
      description:
        "Lanzamientos zero-downtime, escalamiento de infraestructura en la nube y soporte y monitoreo proactivo.",
      color: "bg-primary/10 text-primary border-primary/20",
    },
  ];

  return (
    <section className="w-full py-16 sm:py-24 border-t border-neutral" id="metodologia">
      <div className="mb-12 text-center sm:mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-secondary mb-4">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Proceso de Trabajo
        </div>
        <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl">
          Metodología de Desarrollo
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-body text-base text-black sm:text-lg">
          Un proceso riguroso e iterativo que garantiza la excelencia técnica, seguridad integral y alineación estratégica desde el primer día.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="group relative flex flex-col justify-between rounded-2xl border border-neutral bg-white p-6 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md"
          >
            <div>
              <div
                className={`mb-6 flex h-10 w-10 items-center justify-center rounded-xl border font-label text-sm font-bold ${step.color} transition-transform group-hover:scale-110`}
              >
                {step.number}
              </div>
              <h3 className="font-headline text-lg font-bold text-black mb-2">
                {step.title}
              </h3>
              <p className="font-body text-sm text-black leading-relaxed">
                {step.description}
              </p>
            </div>
            <div className="mt-6 border-t border-neutral pt-4 font-label text-[11px] font-medium text-black">
              Fase {step.number} de 04
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
