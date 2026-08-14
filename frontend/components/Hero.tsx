import ButtonGeneric from "@/components/ButtonGeneric";

export default function Hero() {
  return (
    <section className="grid w-full items-center gap-12 md:grid-cols-2">
      <div className="flex flex-col items-start gap-6 md:self-start">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-black sm:text-5xl lg:text-6xl xl:text-7xl">
          Transforma tu negocio a esta nueva era digital
        </h1>

        <span className="text-base text-black sm:text-lg lg:text-xl xl:text-2xl">
          Llevamos más de 10 años creando soluciones de tecnología y
          acompañando a empresas en su crecimiento.
        </span>

        <ButtonGeneric variant="primary">Contáctanos</ButtonGeneric>
      </div>

      <div className="aspect-square w-full rounded-lg bg-neutral" />
    </section>
  );
}
