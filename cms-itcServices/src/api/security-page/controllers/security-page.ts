/**
 * security-page controller
 */

import { factories } from '@strapi/strapi';
import { CTA, SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::security-page.security-page', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: { heading: true, pillars: true, cta: CTA, seo: SEO },
    });
    return super.find(ctx);
  },
}));
