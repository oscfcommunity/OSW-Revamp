import { CONTENT_SOURCE } from 'astro:env/server';

import { fetchEventFromStrapi, fetchEventsFromStrapi } from './events/strapi';
import { fetchEventsFromSheet } from './events/sheet';
import type { Event } from './events/types';

export type { AgendaItem, Event, Speaker } from './events/types';

/**
 * Public API. Signatures are frozen: pages and components call these and must not
 * know whether the data came from the Google Sheet or from the Strapi CMS.
 */

const CACHE_TTL_MS = 60 * 1000;

interface EventCache {
  data: Event[];
  lastFetched: number;
}

// Both backends live across a network hop, so both are cached briefly. Editors
// see their change within a minute, and a burst of traffic does not fan out into
// a request per visitor.
let cache: EventCache | null = null;

const load = async (): Promise<Event[]> =>
  CONTENT_SOURCE === 'strapi' ? fetchEventsFromStrapi() : fetchEventsFromSheet();

export async function getEvents(): Promise<Event[]> {
  const now = Date.now();

  if (cache && now - cache.lastFetched < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const events = await load();
    cache = { data: events, lastFetched: now };
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    // Serving slightly stale content beats serving an empty events page.
    return cache?.data ?? [];
  }
}

export async function getEvent(slug: string): Promise<Event | undefined> {
  if (CONTENT_SOURCE === 'strapi') {
    try {
      return await fetchEventFromStrapi(slug);
    } catch (error) {
      console.error('Error fetching event:', error);
      return undefined;
    }
  }

  const events = await getEvents();
  return events.find((e) => e.slug === slug);
}
