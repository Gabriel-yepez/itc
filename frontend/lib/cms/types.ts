export type Accent = "primary" | "secondary" | "tertiary" | "neutral";
export type ServiceTrack = "software" | "security";
export type MethodologyTrack = "development" | "security";
export type ServiceLayout = "standard" | "wide" | "centered";

/** Todo documento de Strapi 5 trae estos campos. */
export type StrapiDoc = {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** Las instancias de componente traen `id`; no lo uses como key de React. */
type ComponentId = { id: number };

export type CmsMedia = ComponentId & {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

export type CmsLink = ComponentId & {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  external?: boolean;
};

export type CmsTag = ComponentId & { label: string };
export type CmsMetric = ComponentId & { label: string; value: string };
export type CmsStat = ComponentId & { value: string; label: string; accent: Accent };

export type CmsFeature = ComponentId & {
  label: string;
  description: string | null;
  marker: string | null;
  accent: Accent;
};

export type CmsSectionHeading = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent?: Accent;
  align?: "left" | "center";
};

export type CmsCta = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent: Accent;
  primaryLink: CmsLink | null;
  secondaryLink: CmsLink | null;
};

export type CmsHero = ComponentId & {
  eyebrow: string | null;
  title: string;
  description: string | null;
  accent: Accent;
  image?: CmsMedia | null;
  primaryLink: CmsLink | null;
  secondaryLink?: CmsLink | null;
  panelTitle: string | null;
  panelDescription: string | null;
  panelIcon: string | null;
};

export type CmsSeo = ComponentId & {
  metaTitle: string;
  metaDescription: string;
  /** Separadas por comas. Hay que hacer split antes de pasarlas a Metadata. */
  keywords: string | null;
  canonicalURL: string | null;
  shareImage?: CmsMedia | null;
};

export type CmsOffice = ComponentId & {
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  note: string | null;
};

export type CmsChannel = ComponentId & {
  label: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
};

export type CmsFooterLink = ComponentId & {
  group: "servicios" | "empresa" | "legal";
  label: string;
  href: string;
  order: number;
};

export type CmsInquiryOption = ComponentId & {
  label: string;
  value: string;
  isDefault: boolean;
};

// ---------- Colecciones ----------

export type Service = StrapiDoc & {
  title: string;
  slug: string;
  anchor: string | null;
  track: ServiceTrack;
  description: string;
  body: string | null;
  icon: string | null;
  accent: Accent;
  layout: ServiceLayout;
  badge: string | null;
  order: number;
  features: CmsFeature[];
  tags: CmsTag[];
  cover: CmsMedia | null;
  seo: CmsSeo | null;
};

export type Project = StrapiDoc & {
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  description: string;
  body: string | null;
  tags: CmsTag[];
  metric: CmsMetric | null;
  gradient: string | null;
  /** OJO: el diseño actual de ProjectsGrid no renderiza icono. Campo sin uso. */
  icon: string | null;
  featured: boolean;
  order: number;
  cover: CmsMedia | null;
  gallery: CmsMedia[] | null;
  seo: CmsSeo | null;
};

export type Client = StrapiDoc & {
  name: string;
  industry: string;
  icon: string | null;
  logo: CmsMedia | null;
  website: string | null;
  order: number;
};

export type MethodologyStep = StrapiDoc & {
  stepNumber: string;
  title: string;
  description: string;
  track: MethodologyTrack;
  accent: Accent;
  order: number;
};

export type Certification = StrapiDoc & {
  label: string;
  code: string;
  icon: string | null;
  badge: CmsMedia | null;
  order: number;
};

export type LegalPage = StrapiDoc & {
  title: string;
  slug: string;
  summary: string | null;
  effectiveDate: string | null;
  /** Markdown. Requiere renderizador (ver §7.3). */
  content: string;
  seo: CmsSeo | null;
};

// ---------- Single types ----------

export type Global = StrapiDoc & {
  siteName: string;
  siteUrl: string | null;
  siteDescription: string;
  tagline: string | null;
  footerAbout: string | null;
  logo: CmsMedia | null;
  favicon: CmsMedia | null;
  navLinks: CmsLink[];
  footerLinks: CmsFooterLink[];
  socialLinks?: CmsLink[];
  office: CmsOffice | null;
  channel: CmsChannel | null;
  defaultSeo: CmsSeo | null;
};

export type HomePage = StrapiDoc & {
  hero: CmsHero | null;
  about:
    | (ComponentId & {
        eyebrow: string | null;
        title: string;
        /** Texto plano con párrafos separados por \n\n. Ver §7.3. */
        body: string;
        image?: CmsMedia | null;
        stats: CmsStat[];
        anchor: string | null;
      })
    | null;
  clientsHeading: CmsSectionHeading | null;
  seo: CmsSeo | null;
};

export type ServicesPage = StrapiDoc & {
  softwareTabLabel: string | null;
  securityTabLabel: string | null;
  softwareHero: CmsHero | null;
  softwareHeading: CmsSectionHeading | null;
  methodologyHeading: CmsSectionHeading | null;
  securityHero: CmsHero | null;
  certificationsTitle: string | null;
  securityHeading: CmsSectionHeading | null;
  securityLifecycleHeading: CmsSectionHeading | null;
  cta: CmsCta | null;
  seo: CmsSeo | null;
};

export type ProjectsPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  stats: CmsStat[];
  cta: CmsCta | null;
  seo: CmsSeo | null;
};

export type ContactPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  office: CmsOffice | null;
  channel: CmsChannel | null;
  inquiryOptions: CmsInquiryOption[];
  submitLabel: string | null;
  successTitle: string | null;
  successMessage: string | null;
  seo: CmsSeo | null;
};

export type SecurityPage = StrapiDoc & {
  heading: CmsSectionHeading | null;
  pillars: CmsFeature[];
  cta: CmsCta | null;
  seo: CmsSeo | null;
};
