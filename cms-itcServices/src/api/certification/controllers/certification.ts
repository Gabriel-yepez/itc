/**
 * certification controller
 */

import { factories } from '@strapi/strapi';
import { withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::certification.certification', () => ({
  async find(ctx) {
    withDefaults(ctx, { populate: { badge: true }, sort: ['order:asc', 'label:asc'] });
    return super.find(ctx);
  },
}));
