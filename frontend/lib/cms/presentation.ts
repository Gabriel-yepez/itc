import type { Accent, ServiceLayout } from "./types";

/** Clases literales para que Tailwind las detecte al escanear este archivo. */
export const ACCENT_TEXT: Record<Accent, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  neutral: "text-black",
};

export const ACCENT_BADGE: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  tertiary: "bg-tertiary/10 text-tertiary",
  neutral: "bg-neutral text-black",
};

export const ACCENT_HOVER_BORDER: Record<Accent, string> = {
  primary: "hover:border-primary/40",
  secondary: "hover:border-secondary/40",
  tertiary: "hover:border-tertiary/40",
  neutral: "hover:border-neutral",
};

export const ACCENT_STEP: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary/10 text-secondary border-secondary/20",
  tertiary: "bg-tertiary/10 text-tertiary border-tertiary/20",
  neutral: "bg-neutral text-black border-neutral",
};

export const LAYOUT: Record<ServiceLayout, string> = {
  standard: "",
  wide: "md:col-span-2 flex flex-col justify-between",
  centered: "flex flex-col justify-center items-center text-center",
};

/**
 * Los degradados se guardan en el CMS como la cadena completa de clases. La
 * tabla parece redundante, pero es lo que hace que los literales existan en el
 * código fuente para que Tailwind los compile. Si el CMS trae un valor que no
 * está aquí, se usa el de reserva.
 */
export const PROJECT_GRADIENT: Record<string, string> = {
  "from-primary/20 via-primary/5 to-transparent": "from-primary/20 via-primary/5 to-transparent",
  "from-secondary/20 via-secondary/5 to-transparent": "from-secondary/20 via-secondary/5 to-transparent",
  "from-tertiary/20 via-tertiary/5 to-transparent": "from-tertiary/20 via-tertiary/5 to-transparent",
  "from-primary/20 via-tertiary/5 to-transparent": "from-primary/20 via-tertiary/5 to-transparent",
  "from-secondary/20 via-primary/5 to-transparent": "from-secondary/20 via-primary/5 to-transparent",
  "from-tertiary/20 via-secondary/5 to-transparent": "from-tertiary/20 via-secondary/5 to-transparent",
};

export const FALLBACK_GRADIENT = "from-primary/20 via-primary/5 to-transparent";

export function gradientFor(value: string | null): string {
  return (value && PROJECT_GRADIENT[value]) || FALLBACK_GRADIENT;
}
