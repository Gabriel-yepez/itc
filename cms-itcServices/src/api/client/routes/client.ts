/**
 * client router
 *
 * Solo lectura: el contenido se edita desde el panel de administración, así que
 * la REST API pública no expone create/update/delete.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::client.client', {
  only: ['find', 'findOne'],
});
