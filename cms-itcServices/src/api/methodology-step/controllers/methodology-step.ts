/**
 * methodology-step controller
 */

import { factories } from '@strapi/strapi';
import { withDefaults } from '../../../utils/populate';

export default factories.createCoreController(
  'api::methodology-step.methodology-step',
  () => ({
    async find(ctx) {
      withDefaults(ctx, { sort: ['order:asc', 'stepNumber:asc'] });
      return super.find(ctx);
    },
  })
);
