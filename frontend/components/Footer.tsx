import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { getGlobal } from "@/lib/cms/queries";
import { seo } from "@/lib/seo";

export default async function Footer() {
  "use cache";
  cacheLife("hourly");
  const currentYear = new Date().getFullYear();
  const global = await getGlobal();

  const byGroup = (g: "servicios" | "empresa" | "legal") =>
    global?.footerLinks
      ?.filter((l) => l.group === g)
      .sort((a, b) => a.order - b.order) ?? [];

  const serviciosLinks = byGroup("servicios");
  const empresaLinks = byGroup("empresa");
  const legalLinks = byGroup("legal");

  const logoSrc = global?.logo?.url
    ? `${process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:1337"}${global.logo.url}`
    : seo.logo.src;
  const logoAlt = global?.logo?.alternativeText ?? seo.logo.alt;
  const logoWidth = global?.logo?.width ?? seo.logo.width;
  const logoHeight = global?.logo?.height ?? seo.logo.height;

  const siteName = global?.siteName || seo.title.default;
  const footerAbout =
    global?.footerAbout ??
    "Soluciones de ingeniería de software, arquitectura cloud y ciberseguridad para empresas que escalan.";
  const tagline = global?.tagline ?? "Precisión · Autoridad · Seguridad";

  const office = global?.office;
  const channel = global?.channel;

  return (
    <footer className="w-full border-t border-neutral bg-neutral/30 py-16">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Columna Marca */}
          <div className="flex flex-col items-start gap-4 sm:col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" aria-label="Inicio" className="flex items-center gap-2">
              <Image
                src={logoSrc}
                alt={logoAlt}
                width={logoWidth}
                height={logoHeight}
                className="h-9 w-auto"
              />
              <span className="font-headline text-lg font-bold text-black">
                {siteName}
              </span>
            </Link>
            <p className="font-body text-xs text-black max-w-xs leading-relaxed">
              {footerAbout}
            </p>
          </div>

          {/* Columna Servicios */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Servicios</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              {serviciosLinks.length > 0 ? (
                serviciosLinks.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <>
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
                </>
              )}
            </ul>
          </div>

          {/* Columna Empresa */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Empresa</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              {empresaLinks.length > 0 ? (
                empresaLinks.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/#quienes-somos" className="hover:text-primary transition-colors">
                      Quiénes somos
                    </Link>
                  </li>
                  <li>
                    <Link href="/#clientes" className="hover:text-primary transition-colors">
                      Nuestros clientes
                    </Link>
                  </li>
                  <li>
                    <Link href="/proyectos" className="hover:text-primary transition-colors">
                      Proyectos
                    </Link>
                  </li>
                  <li>
                    <Link href="/servicios#metodologia" className="hover:text-primary transition-colors">
                      Metodología
                    </Link>
                  </li>
                  <li>
                    <Link href="/contacto" className="hover:text-primary transition-colors">
                      Contacto
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Columna Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Legal</h4>
            <ul className="flex flex-col gap-2 font-body text-xs text-black">
              {legalLinks.length > 0 ? (
                legalLinks.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <>
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
                </>
              )}
            </ul>
          </div>

          {/* Columna Ubicación & Contacto Directo */}
          <div className="flex flex-col gap-3">
            <h4 className="font-headline text-sm font-bold text-black">Ubicación & Contacto</h4>
            <div className="flex flex-col gap-3 font-body text-xs text-black leading-relaxed">
              <div>
                <span className="font-label text-[10px] font-bold uppercase tracking-wider text-primary block mb-0.5">
                  {office?.label ?? "Sede Central"}
                </span>
                <p>{office?.addressLine1 ?? "100 Cyber Way, Suite 500"}</p>
                {office?.addressLine2 && <p>{office.addressLine2}</p>}
                {office?.note && (
                  <p className="font-label text-[10px] text-black mt-0.5">{office.note}</p>
                )}
              </div>

              <div className="border-t border-neutral/60 pt-2.5">
                <span className="font-label text-[10px] font-bold uppercase tracking-wider text-secondary block mb-0.5">
                  {channel?.label ?? "Atención Directa"}
                </span>
                {channel?.phone && <p className="font-bold">{channel.phone}</p>}
                {channel?.email && <p>{channel.email}</p>}
                {channel?.hours && (
                  <p className="font-label text-[10px] text-black mt-0.5">{channel.hours}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral pt-8 sm:flex-row font-label text-xs text-black">
          <p>© {currentYear} {siteName}. Todos los derechos reservados.</p>
          <p className="text-black">{tagline}</p>
        </div>
      </div>
    </footer>
  );
}
