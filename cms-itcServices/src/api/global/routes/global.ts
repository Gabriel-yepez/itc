/**
 * global router
 *
 * Solo lectura: el contenido se edita desde el panel de administración.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::global.global', {
  only: ['find'],
});
