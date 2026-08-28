export default function CoreCompetencies() {
  const competencies = [
    {
      title: "Ingeniería Experta",
      description:
        "Bases de código limpias, modulares y escalables diseñadas para entornos empresariales de alta disponibilidad y rendimiento crítico.",
      badgeColor: "bg-primary/10 text-primary group-hover:scale-110",
      borderColor: "hover:border-primary/40",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
    },
    {
      title: "Protección Avanzada",
      description:
        "Arquitectura Zero-Trust implementada por defecto con cifrado de grado militar, escaneo continuo de vulnerabilidades y mitigación proactiva.",
      badgeColor: "bg-secondary/10 text-secondary group-hover:scale-110",
      borderColor: "hover:border-secondary/40",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      title: "Analítica en Tiempo Real",
      description:
        "Observabilidad profunda del rendimiento del sistema, métricas de infraestructura y salud de seguridad mediante paneles unificados de alta densidad.",
      badgeColor: "bg-tertiary/10 text-tertiary group-hover:scale-110",
      borderColor: "hover:border-tertiary/40",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full py-16" id="competencias">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {competencies.map((comp) => (
          <div
            key={comp.title}
            className={`group rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 ${comp.borderColor} hover:shadow-md`}
          >
            <div
              className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 ${comp.badgeColor}`}
            >
              {comp.icon}
            </div>
            <h3 className="font-headline text-xl font-bold text-black mb-3">
              {comp.title}
            </h3>
            <p className="font-body text-sm text-black leading-relaxed">
              {comp.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
