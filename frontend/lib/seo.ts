const siteUrl = "https://example.com"; // TODO: reemplazar por el dominio real de producción

export const seo = {
  siteUrl,
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
        url: "/next.svg",
        width: 1200,
        height: 630,
        alt: "Itc Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Itc Services",
    description:
      "Página de Itc Services, entra y mira nuestros servicios de tecnología y desarrollo de software.",
    images: ["/next.svg"],
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
