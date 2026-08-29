/**
 * services-page controller
 */

import { factories } from '@strapi/strapi';
import { CTA, HERO, SEO, withDefaults } from '../../../utils/populate';

export default factories.createCoreController('api::services-page.services-page', () => ({
  async find(ctx) {
    withDefaults(ctx, {
      populate: {
        softwareHero: HERO,
        softwareHeading: true,
        methodologyHeading: true,
        securityHero: HERO,
        securityHeading: true,
        securityLifecycleHeading: true,
        cta: CTA,
        seo: SEO,
      },
    });
    return super.find(ctx);
  },
}));
