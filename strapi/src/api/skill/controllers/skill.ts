/**
 * skill controller
 */
import { factories } from '@strapi/strapi';

// types/generated/contentTypes.d.ts is produced from the schemas, so a newly
// added content type is not in that union until Strapi regenerates it. Casting
// to the factory's own parameter type keeps the build honest in the meantime.
type ContentTypeUID = Parameters<typeof factories.createCoreController>[0];

export default factories.createCoreController('api::skill.skill' as ContentTypeUID);
