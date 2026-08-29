/**
 * contact-submission controller
 *
 * Endpoint público de escritura. Al ser el único punto de la API en el que un
 * visitante anónimo puede crear registros, el payload se reconstruye desde cero
 * en lugar de reenviarse: así los campos internos (`status`, `notes`,
 * `handledAt`) no pueden fijarse desde el navegador.
 */

import { factories } from '@strapi/strapi';

const MAX_LENGTHS = {
  name: 120,
  email: 254,
  company: 120,
  phone: 40,
  subject: 160,
  message: 5000,
  source: 200,
} as const;

type Field = keyof typeof MAX_LENGTHS;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ventana y cupo del límite de envíos por IP. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const recentSubmissions = new Map<string, number[]>();

type SubmissionData = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
  source?: string;
  status: 'new';
};

/** Error de validación del formulario; se traduce a un 400 con mensaje legible. */
class FormError extends Error {}

/** Cupo de envíos agotado; se traduce a un 429. */
class RateLimitError extends Error {}

function assertWithinRateLimit(ip: string) {
  const now = Date.now();
  const timestamps = (recentSubmissions.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= RATE_LIMIT_MAX) {
    throw new RateLimitError(
      'Has enviado demasiados mensajes. Inténtalo de nuevo en unos minutos.'
    );
  }

  timestamps.push(now);
  recentSubmissions.set(ip, timestamps);

  // Evita que el mapa crezca sin límite en procesos de larga duración.
  if (recentSubmissions.size > 5000) {
    for (const [key, value] of recentSubmissions) {
      if (value.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
        recentSubmissions.delete(key);
      }
    }
  }
}

function readText(
  input: Record<string, unknown>,
  field: Field,
  { required }: { required: boolean }
): string | undefined {
  const raw = input[field];

  if (raw === undefined || raw === null || raw === '') {
    if (required) {
      throw new FormError(`El campo "${field}" es obligatorio.`);
    }
    return undefined;
  }

  if (typeof raw !== 'string') {
    throw new FormError(`El campo "${field}" debe ser texto.`);
  }

  const value = raw.trim();

  if (required && value.length === 0) {
    throw new FormError(`El campo "${field}" es obligatorio.`);
  }

  if (value.length > MAX_LENGTHS[field]) {
    throw new FormError(
      `El campo "${field}" supera el máximo de ${MAX_LENGTHS[field]} caracteres.`
    );
  }

  return value.length > 0 ? value : undefined;
}

export default factories.createCoreController(
  'api::contact-submission.contact-submission',
  ({ strapi }) => ({
    async create(ctx) {
      const body = (ctx.request.body ?? {}) as Record<string, unknown>;
      const input = (body.data ?? body) as Record<string, unknown>;

      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return ctx.badRequest('El cuerpo de la petición no es válido.');
      }

      // Honeypot: los bots rellenan campos ocultos. Se responde 200 para no
      // darles señal de que fueron detectados, pero no se guarda nada.
      if (typeof input.website === 'string' && input.website.trim() !== '') {
        ctx.status = 200;
        return { data: { ok: true } };
      }

      let data: SubmissionData;

      try {
        assertWithinRateLimit(ctx.request.ip ?? 'unknown');

        const email = readText(input, 'email', { required: true })!;

        if (!EMAIL_PATTERN.test(email)) {
          throw new FormError('El correo electrónico no tiene un formato válido.');
        }

        data = {
          name: readText(input, 'name', { required: true })!,
          email: email.toLowerCase(),
          company: readText(input, 'company', { required: false }),
          phone: readText(input, 'phone', { required: false }),
          subject: readText(input, 'subject', { required: true })!,
          message: readText(input, 'message', { required: true })!,
          source: readText(input, 'source', { required: false }) ?? ctx.request.header.referer,
          status: 'new',
        };
      } catch (error) {
        if (error instanceof RateLimitError) {
          return ctx.throw(429, error.message);
        }
        if (error instanceof FormError) {
          return ctx.badRequest(error.message);
        }
        throw error;
      }

      const entry = await strapi
        .documents('api::contact-submission.contact-submission')
        .create({ data });

      strapi.log.info(`[contact] Nuevo mensaje recibido de ${data.email} (${data.subject})`);

      // La respuesta confirma la recepción sin devolver el registro completo.
      ctx.status = 201;
      return { data: { ok: true, documentId: entry.documentId } };
    },
  })
);
