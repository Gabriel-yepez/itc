import Link from "next/link";
import type { CmsHero } from "@/lib/cms/types";

export default function Hero({ hero }: { hero?: CmsHero | null }) {
  const title = hero?.title ?? "Transforma tu negocio a esta nueva era digital";
  const description =
    hero?.description ??
    "Llevamos más de 10 años creando soluciones de tecnología y acompañando a empresas en su crecimiento.";
  const primaryLink = hero?.primaryLink ?? {
    label: "Contáctanos",
    href: "/contacto",
    variant: "primary" as const,
  };

  return (
    <section className="grid w-full items-center gap-12 md:grid-cols-2">
      <div className="flex flex-col items-start gap-6 md:self-start">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-black sm:text-5xl lg:text-6xl xl:text-7xl">
          {title}
        </h1>

        <span className="text-base text-black sm:text-lg lg:text-xl xl:text-2xl">
          {description}
        </span>

        {primaryLink && (
          <Link
            href={primaryLink.href}
            className="rounded-lg px-6 py-3 text-sm font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
          >
            {primaryLink.label}
          </Link>
        )}
      </div>

      <div className="aspect-square w-full rounded-lg bg-neutral" />
    </section>
  );
}
