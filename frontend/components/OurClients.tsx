import type { Client, CmsSectionHeading } from "@/lib/cms/types";

const defaultClients: Client[] = [
  { id: 1, documentId: "c1", createdAt: "", updatedAt: "", publishedAt: "", name: "GlobalFin", industry: "Finanzas", icon: "🏛️", logo: null, website: null, order: 1 },
  { id: 2, documentId: "c2", createdAt: "", updatedAt: "", publishedAt: "", name: "MediTech Health", industry: "Salud", icon: "🏥", logo: null, website: null, order: 2 },
  { id: 3, documentId: "c3", createdAt: "", updatedAt: "", publishedAt: "", name: "LogisCorp", industry: "Logística", icon: "🚢", logo: null, website: null, order: 3 },
  { id: 4, documentId: "c4", createdAt: "", updatedAt: "", publishedAt: "", name: "EduFuture", industry: "Educación", icon: "🎓", logo: null, website: null, order: 4 },
  { id: 5, documentId: "c5", createdAt: "", updatedAt: "", publishedAt: "", name: "RetailConnect", industry: "E-Commerce", icon: "🛍️", logo: null, website: null, order: 5 },
  { id: 6, documentId: "c6", createdAt: "", updatedAt: "", publishedAt: "", name: "SecureNet", industry: "Ciberseguridad", icon: "🛡️", logo: null, website: null, order: 6 },
];

export default function OurClients({
  heading,
  clients,
}: {
  heading?: CmsSectionHeading | null;
  clients?: Client[];
}) {
  const title = heading?.title ?? "Empresas que confían en nosotros";
  const description =
    heading?.description ??
    "Nuestras soluciones impulsan la innovación y la eficiencia en diversas industrias, ayudando a nuestros clientes a alcanzar sus objetivos tecnológicos más ambiciosos.";

  const clientList = clients && clients.length > 0 ? clients : defaultClients;

  return (
    <section className="w-full py-16 sm:py-24 border-t border-neutral" id="clientes">
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl mb-4">
          {title}
        </h2>
        {description && (
          <p className="font-body text-base text-black max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {clientList.map((client) => (
          <div
            key={client.id || client.name}
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
