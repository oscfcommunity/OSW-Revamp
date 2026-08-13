/**
 * event service
 */
import { factories } from '@strapi/strapi';

type ContentTypeUID = Parameters<typeof factories.createCoreService>[0];

export default factories.createCoreService('api::event.event' as ContentTypeUID);
