/**
 * projects-page controller
 */

import { factories } from '@strapi/strapi';
import { CTA, SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::projects-page.projects-page', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: { heading: true, stats: true, cta: CTA, seo: SEO },
    });
    return super.find(ctx);
  },
}));
