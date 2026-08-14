import Image from "next/image";
import Link from "next/link";
import { seo } from "@/lib/seo";

const links = [
  { href: "/servicios", label: "Servicios" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/proyectos", label: "Proyectos" },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-neutral">
      <div className="grid w-full grid-cols-3 items-center px-6 py-4">
        <Link href="/" aria-label="Inicio" className="flex items-center justify-self-start">
          <Image
            src={seo.logo.src}
            alt={seo.logo.alt}
            width={seo.logo.width}
            height={seo.logo.height}
            priority
            className="h-10 w-auto"
          />
        </Link> 
        <ul className="flex items-center justify-center gap-6 font-label sm:text-sm md:text-base lg:text-lg">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-black transition-colors hover:text-primary">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
