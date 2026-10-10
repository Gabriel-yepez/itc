/**
 * contact-submission service
 *
 * Enruta el aviso de cada solicitud al buzón que corresponde según el tipo de
 * consulta elegido en el formulario.
 *
 * Los destinatarios se configuran en el panel, dentro de Contact Page →
 * Inquiry Options → `recipients` (correos separados por comas). Así el equipo
 * cambia a quién le llega cada tipo de consulta sin tocar código ni desplegar.
 * `CONTACT_FALLBACK_RECIPIENTS` del `.env` cubre los casos sin configurar.
 */

import { factories } from '@strapi/strapi';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Submission = {
  documentId: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  subject: string;
  message: string;
  source?: string | null;
};

type Routing = {
  recipients: string[];
  /** Etiqueta del tipo de consulta, para el asunto del aviso. */
  tag: string;
  /** false = no había buzón configurado para este tipo y se usó el de reserva. */
  usedFallback: boolean;
};

/** Trocea una lista de correos separados por comas y descarta lo que no lo sea. */
function parseRecipients(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const seen = new Set<string>();

  for (const candidate of raw.split(',')) {
    const value = candidate.trim().toLowerCase();
    if (value && EMAIL_PATTERN.test(value)) {
      seen.add(value);
    }
  }

  return [...seen];
}

/** El contenido lo escribe un visitante anónimo: se escapa antes de meterlo en HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Evita inyección de cabeceras: ningún salto de línea puede llegar a un header. */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font:600 12px/1.4 system-ui,sans-serif;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font:14px/1.5 system-ui,sans-serif">${escapeHtml(value)}</td>
    </tr>`;
}

export default factories.createCoreService(
  'api::contact-submission.contact-submission',
  ({ strapi }) => ({
    /**
     * Busca el buzón del tipo de consulta indicado. El `subject` que llega del
     * formulario es el `value` de la opción elegida, así que casa directamente
     * con `inquiryOptions[].value`.
     */
    async resolveRouting(subject: string): Promise<Routing> {
      const fallback = parseRecipients(process.env.CONTACT_FALLBACK_RECIPIENTS);

      let option: { label?: string; recipients?: string; notifyTag?: string } | undefined;

      try {
        const page = await strapi.documents('api::contact-page.contact-page').findFirst({
          status: 'published',
          populate: { inquiryOptions: true },
        });

        option = (page?.inquiryOptions as typeof option[] | undefined)?.find(
          (candidate) => (candidate as { value?: string }).value === subject
        );
      } catch (error) {
        // Si el CMS no puede leer su propia configuración, el aviso sigue saliendo
        // por el buzón de reserva en vez de perderse.
        strapi.log.error(
          `[contact] No se pudo leer contact-page para enrutar "${subject}": ${(error as Error).message}`
        );
      }

      const configured = parseRecipients(option?.recipients);
      const tag = option?.notifyTag?.trim() || option?.label?.trim() || subject;

      return {
        recipients: configured.length > 0 ? configured : fallback,
        tag,
        usedFallback: configured.length === 0,
      };
    },

    /**
     * Envía el aviso. Nunca lanza: la solicitud ya está guardada en la base de
     * datos, así que un fallo de SMTP no debe traducirse en un error para quien
     * rellenó el formulario. Los problemas quedan en el log.
     */
    async notify(entry: Submission): Promise<void> {
      const { recipients, tag, usedFallback } = await this.resolveRouting(entry.subject);

      if (recipients.length === 0) {
        strapi.log.error(
          `[contact] Solicitud ${entry.documentId} ("${entry.subject}") SIN DESTINATARIOS. ` +
            'Configura Contact Page → Inquiry Options → recipients, o CONTACT_FALLBACK_RECIPIENTS en el .env.'
        );
        return;
      }

      if (usedFallback) {
        strapi.log.warn(
          `[contact] "${entry.subject}" no tiene buzón propio; se usa CONTACT_FALLBACK_RECIPIENTS.`
        );
      }

      const adminUrl = (process.env.STRAPI_ADMIN_URL ?? 'http://localhost:1337').replace(/\/$/, '');
      const entryUrl = `${adminUrl}/admin/content-manager/collection-types/api::contact-submission.contact-submission/${entry.documentId}`;

      const subject = headerSafe(`[ITC · ${tag}] Nueva solicitud de ${entry.name}`);

      const html = `<div style="max-width:640px;margin:0 auto;font-family:system-ui,sans-serif">
  <p style="display:inline-block;margin:0 0 16px;padding:4px 10px;border-radius:999px;background:#ede9fe;color:#7c3aed;font:600 11px/1.4 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(tag)}</p>
  <h1 style="margin:0 0 8px;color:#111827;font:700 20px/1.3 system-ui,sans-serif">Nueva solicitud de servicios</h1>
  <p style="margin:0 0 20px;color:#374151;font:14px/1.6 system-ui,sans-serif">
    <strong>${escapeHtml(entry.name)}</strong> ha solicitado información sobre <strong>${escapeHtml(entry.subject)}</strong>.
  </p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;padding-top:12px">
    ${row('Nombre', entry.name)}
    ${row('Correo', entry.email)}
    ${row('Empresa', entry.company)}
    ${row('Teléfono', entry.phone)}
    ${row('Tipo de consulta', entry.subject)}
    ${row('Origen', entry.source)}
  </table>
  <p style="margin:20px 0 6px;color:#6b7280;font:600 12px/1.4 system-ui,sans-serif">MENSAJE</p>
  <div style="padding:14px 16px;border-radius:12px;background:#f3f4f6;color:#111827;font:14px/1.6 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(entry.message)}</div>
  <p style="margin:24px 0 0;font:14px/1.5 system-ui,sans-serif">
    <a href="${entryUrl}" style="color:#7c3aed">Ver la solicitud en el panel</a>
  </p>
  <p style="margin:16px 0 0;color:#9ca3af;font:12px/1.5 system-ui,sans-serif">
    Responder a este correo escribe directamente a ${escapeHtml(entry.email)}.
  </p>
</div>`;

      const text = [
        `Nueva solicitud de servicios — ${tag}`,
        '',
        `Nombre:            ${entry.name}`,
        `Correo:            ${entry.email}`,
        entry.company ? `Empresa:           ${entry.company}` : null,
        entry.phone ? `Teléfono:          ${entry.phone}` : null,
        `Tipo de consulta:  ${entry.subject}`,
        entry.source ? `Origen:            ${entry.source}` : null,
        '',
        'Mensaje:',
        entry.message,
        '',
        `Ver en el panel: ${entryUrl}`,
      ]
        .filter((line) => line !== null)
        .join('\n');

      try {
        await strapi.plugin('email').service('email').send({
          to: recipients,
          // Responder al aviso escribe al visitante, no al buzón genérico.
          replyTo: headerSafe(entry.email),
          subject,
          html,
          text,
        });

        strapi.log.info(
          `[contact] Aviso de "${entry.subject}" enviado a ${recipients.join(', ')}`
        );
      } catch (error) {
        strapi.log.error(
          `[contact] Falló el envío del aviso para ${entry.documentId} (${entry.email}): ${(error as Error).message}. ` +
            'La solicitud SÍ quedó guardada; revísala en el panel.'
        );
      }
    },
  })
);
