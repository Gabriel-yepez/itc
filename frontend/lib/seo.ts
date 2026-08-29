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
    "Firma boutique de ingeniería de software y consultoría tecnológica especializada en plataformas escalables, arquitecturas cloud y seguridad Zero-Trust.",
  keywords: [
    "Productos de Software",
    "Consultoría de seguridad de la información",
    "Software a la medida",
    "Desarrollo de software",
    "Servicios de tecnología",
    "Arquitectura Cloud",
    "DevSecOps",
    "Ingeniería de Software",
  ],
  authors: [{ name: "Itc Services" }],
  creator: "Itc Services",
  publisher: "Itc Services",
  locale: "es_ES",
  viewport: {
    width: "device-width",
    initialScale: 1,
    themeColor: "#7c3aed",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "Itc Services",
    title: "Itc Services | Ingeniería de Software & Tecnología",
    description:
      "Firma boutique de ingeniería de software y consultoría tecnológica especializada en plataformas escalables, arquitecturas cloud y seguridad Zero-Trust.",
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
    title: "Itc Services | Ingeniería de Software & Tecnología",
    description:
      "Firma boutique de ingeniería de software y consultoría tecnológica especializada en plataformas escalables, arquitecturas cloud y seguridad Zero-Trust.",
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

  /* Páginas específicas */
  pages: {
    home: {
      title: "Itc Services | Ingeniería de Software & Soluciones Tecnológicas",
      description:
        "Desarrollamos soluciones de software robustas, escalables y seguras con estándares de clase mundial. Arquitectura cloud, aplicaciones web y móviles.",
      keywords: [
        "Desarrollo de software",
        "Ingeniería de software",
        "Arquitectura Cloud",
        "Ciberseguridad",
        "Itc Services",
      ],
    },
    servicios: {
      title: "Servicios de Desarrollo e Ingeniería de Software",
      description:
        "Descubre nuestros servicios de ingeniería de software a medida, desarrollo web y móvil, arquitectura cloud de alto rendimiento y prácticas DevSecOps con seguridad Zero-Trust.",
      keywords: [
        "Servicios de desarrollo de software",
        "Ingeniería de software a medida",
        "Desarrollo web moderno",
        "Desarrollo móvil iOS Android",
        "Arquitectura Cloud y DevOps",
        "DevSecOps",
        "Microservicios escalables",
        "Seguridad Zero-Trust",
      ],
      openGraph: {
        title: "Servicios de Desarrollo e Ingeniería de Software | Itc Services",
        description:
          "Descubre nuestros servicios de ingeniería de software a medida, desarrollo web y móvil, arquitectura cloud de alto rendimiento y prácticas DevSecOps con seguridad Zero-Trust.",
        url: `${siteUrl}/servicios`,
      },
    },
    proyectos: {
      title: "Proyectos y Casos de Éxito",
      description:
        "Explora nuestro portafolio de proyectos y casos de éxito en ingeniería de software, modernización de infraestructura, plataformas fintech y aplicaciones de alta demanda.",
      keywords: [
        "Proyectos de software",
        "Portafolio de desarrollo",
        "Casos de éxito de ingeniería de software",
        "Arquitectura de sistemas complejos",
        "Plataformas fintech",
        "Sistemas distribuidos",
        "Itc Services portafolio",
      ],
      openGraph: {
        title: "Proyectos y Casos de Éxito | Itc Services",
        description:
          "Explora nuestro portafolio de proyectos y casos de éxito en ingeniería de software, modernización de infraestructura, plataformas fintech y aplicaciones de alta demanda.",
        url: `${siteUrl}/proyectos`,
      },
    },
    contacto: {
      title: "Contacto y Consultoría Técnica",
      description:
        "Ponte en contacto con los arquitectos e ingenieros de Itc Services. Solicita una cotización, asesoría técnica o consultoría estratégica para tu próximo proyecto de software.",
      keywords: [
        "Contacto Itc Services",
        "Cotización de desarrollo de software",
        "Consultoría en ingeniería de software",
        "Asesoría técnica",
        "Contratar desarrolladores de software",
        "Auditoría técnica y seguridad",
      ],
      openGraph: {
        title: "Contacto y Consultoría Técnica | Itc Services",
        description:
          "Ponte en contacto con los arquitectos e ingenieros de Itc Services. Solicita una cotización, asesoría técnica o consultoría estratégica para tu próximo proyecto de software.",
        url: `${siteUrl}/contacto`,
      },
    },
  },
};
