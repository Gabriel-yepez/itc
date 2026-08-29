export default function OurClients() {
  const clients = [
    { name: "GlobalFin", industry: "Finanzas", icon: "🏛️" },
    { name: "MediTech Health", industry: "Salud", icon: "🏥" },
    { name: "LogisCorp", industry: "Logística", icon: "🚢" },
    { name: "EduFuture", industry: "Educación", icon: "🎓" },
    { name: "RetailConnect", industry: "E-Commerce", icon: "🛍️" },
    { name: "SecureNet", industry: "Ciberseguridad", icon: "🛡️" },
  ];

  return (
    <section className="w-full py-16 sm:py-24 border-t border-neutral" id="clientes">
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl mb-4">
          Empresas que confían en nosotros
        </h2>
        <p className="font-body text-base text-black max-w-2xl">
          Nuestras soluciones impulsan la innovación y la eficiencia en diversas industrias, ayudando a nuestros clientes a alcanzar sus objetivos tecnológicos más ambiciosos.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {clients.map((client, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center p-6 rounded-xl border border-neutral bg-white shadow-sm hover:shadow-md transition-shadow duration-300 group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
              {client.icon}
            </div>
            <h3 className="font-headline text-sm font-bold text-black text-center">
              {client.name}
            </h3>
            <p className="font-label text-xs text-black mt-1 text-center">
              {client.industry}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
