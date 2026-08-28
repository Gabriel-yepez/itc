"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { seo } from "@/lib/seo";

const links = [
  { href: "/servicios", label: "Servicios" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/proyectos", label: "Proyectos" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLUListElement>(null);

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return true;
    }
    if (href === "/servicios" && (pathname === "/services" || pathname.startsWith("/services/"))) {
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
