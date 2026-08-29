/**
 *  global controller
 */

import { factories } from '@strapi/strapi';
import { SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::global.global', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: {
        logo: true,
        favicon: true,
        navLinks: true,
        footerLinks: true,
        socialLinks: true,
        office: true,
        channel: true,
        defaultSeo: SEO,
      },
    });
    return super.find(ctx);
  },
}));
