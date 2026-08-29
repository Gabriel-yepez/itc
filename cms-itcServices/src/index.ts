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
  'api::service.service': ['find', 'findOne'],
  'api::project.project': ['find', 'findOne'],
  'api::client.client': ['find', 'findOne'],
  'api::competency.competency': ['find', 'findOne'],
  'api::methodology-step.methodology-step': ['find', 'findOne'],
  'api::certification.certification': ['find', 'findOne'],
  'api::legal-page.legal-page': ['find', 'findOne'],
  'api::contact-submission.contact-submission': ['create'],
};

/**
 * Concede los permisos públicos una única vez, la primera vez que arranca esta
 * base de datos. Después no se vuelve a tocar: si el equipo revoca un permiso
 * desde el panel, el siguiente arranque respeta esa decisión.
 */
async function grantPublicPermissionsOnce(strapi: Core.Strapi) {
  const store = strapi.store({ environment: '', type: 'plugin', name: 'itc-setup' });

  if (await store.get({ key: 'publicPermissionsGranted' })) {
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

  await store.set({ key: 'publicPermissionsGranted', value: true });
  strapi.log.info('[itc] Permisos públicos de la API configurados.');
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
