import type { Schema, Struct } from '@strapi/strapi';

export interface ContactChannel extends Struct.ComponentSchema {
  collectionName: 'components_contact_channels';
  info: {
    description: 'Canal de contacto directo (tel\u00E9fono, email, horario)';
    displayName: 'Channel';
    icon: 'phone';
  };
  attributes: {
    email: Schema.Attribute.Email;
    hours: Schema.Attribute.String;
    label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Contacto Directo'>;
    phone: Schema.Attribute.String;
  };
}

export interface ContactInquiryOption extends Struct.ComponentSchema {
  collectionName: 'components_contact_inquiry_options';
  info: {
    description: 'Opci\u00F3n del desplegable "Tipo de Consulta" del formulario';
    displayName: 'Inquiry Option';
    icon: 'filter';
  };
  attributes: {
    isDefault: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactOffice extends Struct.ComponentSchema {
  collectionName: 'components_contact_offices';
  info: {
    description: 'Sede f\u00EDsica de la empresa';
    displayName: 'Office';
    icon: 'pinMap';
  };
  attributes: {
    addressLine1: Schema.Attribute.String & Schema.Attribute.Required;
    addressLine2: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Sede Central'>;
    note: Schema.Attribute.String;
  };
}

export interface NavFooterLink extends Struct.ComponentSchema {
  collectionName: 'components_nav_footer_links';
  info: {
    description: 'Enlace del pie de p\u00E1gina, agrupado por columna';
    displayName: 'Footer Link';
    icon: 'bulletList';
  };
  attributes: {
    group: Schema.Attribute.Enumeration<['servicios', 'empresa', 'legal']> &
      Schema.Attribute.Required;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface SectionsAbout extends Struct.ComponentSchema {
  collectionName: 'components_sections_abouts';
  info: {
    description: 'Secci\u00F3n "Qui\u00E9nes Somos" con texto largo y cifras clave';
    displayName: 'About';
    icon: 'user';
  };
  attributes: {
    anchor: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'quienes-somos'>;
    body: Schema.Attribute.RichText & Schema.Attribute.Required;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Qui\u00E9nes Somos'>;
    image: Schema.Attribute.Media<'images'>;
    stats: Schema.Attribute.Component<'ui.stat', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    keywords: Schema.Attribute.Text;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface UiCta extends Struct.ComponentSchema {
  collectionName: 'components_ui_ctas';
  info: {
    description: 'Bloque de llamada a la acci\u00F3n con hasta dos botones';
    displayName: 'Cta';
    icon: 'cursor';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'neutral']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    primaryLink: Schema.Attribute.Component<'ui.link', false>;
    secondaryLink: Schema.Attribute.Component<'ui.link', false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UiFeature extends Struct.ComponentSchema {
  collectionName: 'components_ui_features';
  info: {
    description: 'Punto de detalle dentro de una tarjeta de servicio';
    displayName: 'Feature';
    icon: 'bulletList';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'neutral']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
    description: Schema.Attribute.Text;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    marker: Schema.Attribute.String;
  };
}

export interface UiHero extends Struct.ComponentSchema {
  collectionName: 'components_ui_heroes';
  info: {
    description: 'Cabecera principal de una p\u00E1gina o pesta\u00F1a, con panel lateral';
    displayName: 'Hero';
    icon: 'landscape';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'neutral']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    panelDescription: Schema.Attribute.Text;
    panelIcon: Schema.Attribute.String;
    panelTitle: Schema.Attribute.String;
    primaryLink: Schema.Attribute.Component<'ui.link', false>;
    secondaryLink: Schema.Attribute.Component<'ui.link', false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UiLink extends Struct.ComponentSchema {
  collectionName: 'components_ui_links';
  info: {
    description: 'Enlace o bot\u00F3n de acci\u00F3n';
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    external: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['primary', 'secondary', 'ghost']> &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface UiMetric extends Struct.ComponentSchema {
  collectionName: 'components_ui_metrics';
  info: {
    description: 'M\u00E9trica de resultado de un proyecto (ej. Reducci\u00F3n de Riesgos / 94%)';
    displayName: 'Metric';
    icon: 'chartPie';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UiSectionHeading extends Struct.ComponentSchema {
  collectionName: 'components_ui_section_headings';
  info: {
    description: 'Encabezado de secci\u00F3n: p\u00EDldora, t\u00EDtulo y descripci\u00F3n';
    displayName: 'Section Heading';
    icon: 'typhon';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'neutral']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    description: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UiStat extends Struct.ComponentSchema {
  collectionName: 'components_ui_stats';
  info: {
    description: 'Cifra destacada con su etiqueta (ej. 10+ / A\u00F1os de Experiencia)';
    displayName: 'Stat';
    icon: 'chartBubble';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'tertiary', 'neutral']
    > &
      Schema.Attribute.DefaultTo<'primary'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UiTag extends Struct.ComponentSchema {
  collectionName: 'components_ui_tags';
  info: {
    description: 'Etiqueta corta de tecnolog\u00EDa o categor\u00EDa';
    displayName: 'Tag';
    icon: 'price-tag';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'contact.channel': ContactChannel;
      'contact.inquiry-option': ContactInquiryOption;
      'contact.office': ContactOffice;
      'nav.footer-link': NavFooterLink;
      'sections.about': SectionsAbout;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'ui.cta': UiCta;
      'ui.feature': UiFeature;
      'ui.hero': UiHero;
      'ui.link': UiLink;
      'ui.metric': UiMetric;
      'ui.section-heading': UiSectionHeading;
      'ui.stat': UiStat;
      'ui.tag': UiTag;
    }
  }
}
