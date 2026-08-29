import type { Core } from '@strapi/strapi';

/**
 * Permisos que el rol `public` necesita para que el frontend consuma la API sin
 * token. Todo es de solo lectura salvo el formulario de contacto, que solo puede
 * crear.
 */
const PUBLIC_PERMISSIONS: Record<string, string[]> = {
  'api::global.global': ['find'],
  'api::home-page.home-page': ['find'],
  'api::services-page.services-page': ['find'],
  'api::projects-page.projects-page': ['find'],
  'api::contact-page.contact-page': ['find'],
  'api::security-page.security-page': ['find'],
  'api::service.service': ['find', 'findOne'],
  'api::project.project': ['find', 'findOne'],
  'api::client.client': ['find', 'findOne'],
  'api::methodology-step.methodology-step': ['find', 'findOne'],
  'api::certification.certification': ['find', 'findOne'],
  'api::legal-page.legal-page': ['find', 'findOne'],
  'api::contact-submission.contact-submission': ['create'],
};

/**
 * Se incrementa al añadir entradas a PUBLIC_PERMISSIONS, para que las bases de
 * datos ya inicializadas reciban los permisos nuevos en el siguiente arranque.
 */
const PUBLIC_PERMISSIONS_VERSION = 2;

/**
 * Concede los permisos públicos que falten y anota la versión aplicada. Mientras
 * la versión no cambie no se vuelve a tocar nada: si el equipo revoca un permiso
 * desde el panel, los arranques siguientes respetan esa decisión.
 */
async function grantPublicPermissionsOnce(strapi: Core.Strapi) {
  const store = strapi.store({ environment: '', type: 'plugin', name: 'itc-setup' });

  const appliedVersion = (await store.get({ key: 'publicPermissionsVersion' })) as number | null;

  if (appliedVersion !== null && appliedVersion >= PUBLIC_PERMISSIONS_VERSION) {
    return;
  }

  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[itc] No se encontró el rol público; se omite la configuración de permisos.');
    return;
  }

  for (const [uid, actions] of Object.entries(PUBLIC_PERMISSIONS)) {
    for (const action of actions) {
      const permission = `${uid}.${action}`;

      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: permission, role: publicRole.id } });

      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action: permission, role: publicRole.id } });
      }
    }
  }

  await store.set({ key: 'publicPermissionsVersion', value: PUBLIC_PERMISSIONS_VERSION });
  strapi.log.info(
    `[itc] Permisos públicos de la API configurados (v${PUBLIC_PERMISSIONS_VERSION}).`
  );
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicPermissionsOnce(strapi);
  },
};
