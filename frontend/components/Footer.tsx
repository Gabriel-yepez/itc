import Image from "next/image";
import Link from "next/link";
import { seo } from "@/lib/seo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-neutral bg-neutral/30 py-16">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1 flex flex-col items-start gap-4">
            <Link href="/" aria-label="Inicio" className="flex items-center gap-2">
              <Image
                src={seo.logo.src}
                alt={seo.logo.alt}
                width={seo.logo.width}
                height={seo.logo.height}
                className="h-9 w-auto"
              />
              <span className="font-headline text-lg font-bold text-black">
                {seo.title.default}
              </span>
            </Link>
            <p className="font-body text-xs text-black max-w-xs leading-relaxed">
              Soluciones de ingeniería de software, arquitectura cloud y ciberseguridad para empresas que escalan.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Servicios</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              <li>
                <Link href="/servicios#web" className="hover:text-primary transition-colors">
                  Aplicaciones Web
                </Link>
              </li>
              <li>
                <Link href="/servicios#cloud" className="hover:text-primary transition-colors">
                  Cloud & Backend
                </Link>
              </li>
              <li>
                <Link href="/servicios#mobile" className="hover:text-primary transition-colors">
                  Desarrollo Móvil
                </Link>
              </li>
              <li>
                <Link href="/servicios#devsecops" className="hover:text-primary transition-colors">
                  DevSecOps
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Empresa</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              <li>
                <Link href="/quienes-somos" className="hover:text-primary transition-colors">
                  Quiénes somos
                </Link>
              </li>
              <li>
                <Link href="/proyectos" className="hover:text-primary transition-colors">
                  Proyectos
                </Link>
              </li>
              <li>
                <Link href="#metodologia" className="hover:text-primary transition-colors">
                  Metodología
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-primary transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Legal</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              <li>
                <Link href="/privacidad" className="hover:text-primary transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-primary transition-colors">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/seguridad" className="hover:text-primary transition-colors">
                  Auditoría de Seguridad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral pt-8 sm:flex-row font-label text-xs text-black">
          <p>© {currentYear} {seo.title.default}. Todos los derechos reservados.</p>
          <p className="text-black">Precisión · Autoridad · Seguridad</p>
        </div>
      </div>
    </footer>
  );
}
