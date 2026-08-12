import { fetchCollection } from '../strapi/client';
import { toEvent, type StrapiEvent } from '../strapi/map';
import type { Event } from './types';

const POPULATE = {
  'populate[0]': 'speakers',
  'populate[1]': 'agenda',
  'populate[2]': 'event_tags',
  'populate[3]': 'images',
  'sort[0]': 'start_date:asc',
} as const;

export const fetchEventsFromStrapi = async (): Promise<Event[]> => {
  const rows = await fetchCollection<StrapiEvent>('events', { ...POPULATE });
  return rows.map(toEvent);
};

export const fetchEventFromStrapi = async (slug: string): Promise<Event | undefined> => {
  const rows = await fetchCollection<StrapiEvent>('events', {
    ...POPULATE,
    'filters[slug][$eq]': slug,
  });
  const row = rows[0];
  return row ? toEvent(row) : undefined;
};
