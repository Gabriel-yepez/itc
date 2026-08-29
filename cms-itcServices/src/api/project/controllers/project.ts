/**
 * project controller
 */

import { factories } from '@strapi/strapi';
import { SEO, withDefaults } from '../../../utils/populate';

const defaults = {
  populate: { tags: true, metric: true, cover: true, gallery: true, seo: SEO },
  sort: ['order:asc', 'title:asc'],
};

export default factories.createCoreController('api::project.project', () => ({
  async find(ctx) {
    withDefaults(ctx, defaults);
    return super.find(ctx);
  },

  async findOne(ctx) {
    withDefaults(ctx, { populate: defaults.populate });
    return super.findOne(ctx);
  },
}));
