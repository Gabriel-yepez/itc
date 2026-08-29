/**
 * client controller
 */

import { factories } from '@strapi/strapi';
import { withDefaults } from '../../../utils/populate';

const defaults = {
  populate: { logo: true },
  sort: ['order:asc', 'name:asc'],
};

export default factories.createCoreController('api::client.client', () => ({
  async find(ctx) {
    withDefaults(ctx, defaults);
    return super.find(ctx);
  },

  async findOne(ctx) {
    withDefaults(ctx, { populate: defaults.populate });
    return super.findOne(ctx);
  },
}));
