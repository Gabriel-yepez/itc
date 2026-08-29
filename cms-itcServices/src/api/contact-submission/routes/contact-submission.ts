/**
 * contact-submission router
 *
 * Solo se expone `create`: el formulario público de /contacto escribe, pero
 * nadie puede leer, editar ni borrar los mensajes a través de la REST API.
 * La bandeja de entrada se consulta únicamente desde el panel de administración.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::contact-submission.contact-submission', {
  only: ['create'],
});
