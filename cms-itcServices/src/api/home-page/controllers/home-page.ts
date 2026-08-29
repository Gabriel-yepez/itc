/**
 * home-page controller
 */

import { factories } from '@strapi/strapi';
import { ABOUT, HERO, SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::home-page.home-page', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: {
        hero: HERO,
        about: ABOUT,
        clientsHeading: true,
        seo: SEO,
      },
    });
    return super.find(ctx);
  },
}));
