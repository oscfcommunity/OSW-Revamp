/**
 * skill router
 */
import { factories } from '@strapi/strapi';

type ContentTypeUID = Parameters<typeof factories.createCoreRouter>[0];

export default factories.createCoreRouter('api::skill.skill' as ContentTypeUID);
