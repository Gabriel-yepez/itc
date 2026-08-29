'use strict';

/**
 * Carga en el CMS el contenido que el frontend de ITC Services trae escrito a
 * mano, de modo que la API devuelva desde el primer arranque exactamente lo que
 * hoy se muestra en pantalla.
 *
 * Es idempotente: las colecciones se identifican por su clave natural (slug,
 * name, code...) y los single types por su documento único, así que volver a
 * ejecutarlo actualiza en lugar de duplicar.
 *
 *   pnpm seed:itc
 */

const data = require('../data/itc-data.json');

/** Clave natural con la que se busca un registro existente en cada colección. */
const COLLECTIONS = [
  { uid: 'api::client.client', key: 'name', items: data.clients },
  { uid: 'api::service.service', key: 'slug', items: data.services },
  { uid: 'api::project.project', key: 'slug', items: data.projects },
  { uid: 'api::certification.certification', key: 'code', items: data.certifications },
  { uid: 'api::legal-page.legal-page', key: 'slug', items: data['legal-pages'] },
];

const SINGLE_TYPES = [
  { uid: 'api::global.global', entry: data.global },
  { uid: 'api::home-page.home-page', entry: data['home-page'] },
  { uid: 'api::services-page.services-page', entry: data['services-page'] },
  { uid: 'api::projects-page.projects-page', entry: data['projects-page'] },
  { uid: 'api::contact-page.contact-page', entry: data['contact-page'] },
  { uid: 'api::security-page.security-page', entry: data['security-page'] },
];

async function seedCollection(strapi, { uid, key, items }) {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const [existing] = await strapi.documents(uid).findMany({
      filters: { [key]: item[key] },
      status: 'draft',
      limit: 1,
    });

    if (existing) {
      await strapi.documents(uid).update({ documentId: existing.documentId, data: item });
      await strapi.documents(uid).publish({ documentId: existing.documentId });
      updated += 1;
    } else {
      const entry = await strapi.documents(uid).create({ data: item });
      await strapi.documents(uid).publish({ documentId: entry.documentId });
      created += 1;
    }
  }

  console.log(`  ${uid}: ${created} creados, ${updated} actualizados`);
}

/**
 * `methodology-step` no tiene una clave natural de un solo campo: el número de
 * paso solo es único dentro de su track. Se filtra por la pareja completa.
 */
async function seedMethodologySteps(strapi) {
  const uid = 'api::methodology-step.methodology-step';
  let created = 0;
  let updated = 0;

  for (const step of data['methodology-steps']) {
    const [existing] = await strapi.documents(uid).findMany({
      filters: { track: step.track, stepNumber: step.stepNumber },
      status: 'draft',
      limit: 1,
    });

    if (existing) {
      await strapi.documents(uid).update({ documentId: existing.documentId, data: step });
      await strapi.documents(uid).publish({ documentId: existing.documentId });
      updated += 1;
    } else {
      const entry = await strapi.documents(uid).create({ data: step });
      await strapi.documents(uid).publish({ documentId: entry.documentId });
      created += 1;
    }
  }

  console.log(`  ${uid}: ${created} creados, ${updated} actualizados`);
}

async function seedSingleType(strapi, { uid, entry }) {
  const contentType = strapi.contentType(uid);
  const isDraftAndPublish = contentType.options?.draftAndPublish === true;

  // Los single types tienen un único documento: se actualiza si ya existe y se
  // crea la primera vez.
  const existing = await strapi.documents(uid).findFirst({ status: 'draft' });

  const document = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data: entry })
    : await strapi.documents(uid).create({ data: entry });

  if (isDraftAndPublish) {
    await strapi.documents(uid).publish({ documentId: document.documentId });
  }

  console.log(`  ${uid}: listo`);
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  try {
    console.log('Cargando contenido de ITC Services...');

    for (const collection of COLLECTIONS) {
      await seedCollection(app, collection);
    }

    await seedMethodologySteps(app);

    for (const singleType of SINGLE_TYPES) {
      await seedSingleType(app, singleType);
    }

    console.log('Contenido cargado.');
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
