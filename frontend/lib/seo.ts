const siteUrl = "https://example.com"; // TODO: reemplazar por el dominio real de producción

const logo = {
  src: "/logo-principal.svg",
  width: 512,
  height: 512,
  alt: "Itc Services",
};

export const seo = {
  siteUrl,
  logo,
  title: {
    default: "Itc Services",
    template: "%s | Itc Services",
  },
  description:
    "Página de Itc Services, entra y mira nuestros servicios de tecnología y desarrollo de software.",
  keywords: [
    "Productos de Software",
    "Consultoría de seguridad de la información",
    "Software a la medida",
    "Desarrollo de software",
    "Servicios de tecnología",
  ],
  authors: [{ name: "Itc Services" }],
  creator: "Itc Services",
  publisher: "Itc Services",
  locale: "es_ES",
  viewport: {
    width: "device-width",
    initialScale: 1,
    themeColor: "#0f172a",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "Itc Services",
    title: "Itc Services",
    description:
      "Página de Itc Services, entra y mira nuestros servicios de tecnología y desarrollo de software.",
    images: [
      {
        url: logo.src,
        width: logo.width,
        height: logo.height,
        alt: logo.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Itc Services",
    description:
      "Página de Itc Services, entra y mira nuestros servicios de tecnología y desarrollo de software.",
    images: [logo.src],
  },
  icons: {
    icon: logo.src,
    shortcut: logo.src,
    apple: logo.src,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};
