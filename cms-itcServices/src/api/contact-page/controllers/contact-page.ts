/**
 * contact-page controller
 */

import { factories } from '@strapi/strapi';
import { SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::contact-page.contact-page', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: {
        heading: true,
        office: true,
        channel: true,
        inquiryOptions: true,
        seo: SEO,
      },
    });
    return super.find(ctx);
  },
}));
