"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { seo } from "@/lib/seo";
import type { CmsLink, CmsMedia } from "@/lib/cms/types";

const defaultLinks: CmsLink[] = [
  { id: 1, href: "/servicios", label: "Servicios", variant: "ghost", external: false },
  { id: 2, href: "/proyectos", label: "Proyectos", variant: "ghost", external: false },
  { id: 3, href: "/contacto", label: "Contacto", variant: "ghost", external: false },
];

export default function NavbarClient({
  navLinks,
  logo,
}: {
  navLinks?: CmsLink[];
  logo?: CmsMedia | null;
}) {
  const pathname = usePathname();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLUListElement>(null);

  const links = navLinks && navLinks.length > 0 ? navLinks : defaultLinks;

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return true;
    }
    // Soporte para alias de rutas como /services o /contact
    if (href === "/servicios" && (pathname === "/services" || pathname.startsWith("/services/"))) {
      return true;
    }
    if (href === "/contacto" && (pathname === "/contact" || pathname.startsWith("/contact/"))) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;
      const activeElement = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeElement) {
        setIndicator({
          left: activeElement.offsetLeft,
          width: activeElement.offsetWidth,
          opacity: 1,
        });
      } else {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();

    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [pathname]);

  const logoSrc = logo?.url
    ? `${process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:1337"}${logo.url}`
    : seo.logo.src;
  const logoAlt = logo?.alternativeText ?? seo.logo.alt;
  const logoWidth = logo?.width ?? seo.logo.width;
  const logoHeight = logo?.height ?? seo.logo.height;

  return (
    <nav className="w-full bg-neutral">
      <div className="grid w-full grid-cols-3 items-center px-6 py-4">
        <Link href="/" aria-label="Inicio" className="flex items-center justify-self-start">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={logoWidth}
            height={logoHeight}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <ul
          ref={navRef}
          className="relative flex items-center justify-center gap-6 font-label sm:text-sm md:text-base lg:text-lg"
        >
          {links.map(({ href, label }) => {
            const active = isLinkActive(href);
            return (
              <li key={href} data-active={active ? "true" : "false"} className="relative">
                <Link
                  href={href}
                  className={`pb-1 transition-colors duration-200 block ${
                    active ? "text-primary font-bold" : "text-black hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}

          {/* Indicador con animación de desplazamiento CSS */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{
              left: `${indicator.left}px`,
              width: `${indicator.width}px`,
              opacity: indicator.opacity,
              transform: "translateZ(0)",
            }}
          />
        </ul>
      </div>
    </nav>
  );
}
