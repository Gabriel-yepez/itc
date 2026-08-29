/**
 * projects-page router
 *
 * Solo lectura: el contenido se edita desde el panel de administración.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::projects-page.projects-page', {
  only: ['find'],
});
