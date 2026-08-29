/**
 * legal-page controller
 */

import { factories } from '@strapi/strapi';
import { SEO, withDefaults } from '../../../utils/populate';

const defaults = { populate: { seo: SEO } };

export default factories.createCoreController('api::legal-page.legal-page', () => ({
  async find(ctx) {
    withDefaults(ctx, { ...defaults, sort: ['title:asc'] });
    return super.find(ctx);
  },

  async findOne(ctx) {
    withDefaults(ctx, defaults);
    return super.findOne(ctx);
  },
}));
