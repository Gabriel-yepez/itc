/**
 * competency controller
 */

import { factories } from '@strapi/strapi';
import { withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::competency.competency', () => ({
  async find(ctx) {
    withDefaults(ctx, { sort: ['order:asc', 'title:asc'] });
    return super.find(ctx);
  },
}));
