import { CONTENT_SOURCE } from 'astro:env/server';

import { db } from '../db';
import { fetchEventFromDb, fetchEventsFromDb } from './events/repo';
import { fetchEventsFromSheet } from './events/sheet';
import type { Event } from './events/types';

export type { AgendaItem, Event, Speaker } from './events/types';

/**
 * Public API. Signatures are frozen: pages and components call these and must not
 * know whether the data came from the Google Sheet or from Postgres.
 */

const CACHE_TTL_MS = 60 * 1000;

interface EventCache {
  data: Event[];
  lastFetched: number;
}

// The sheet lives across a network hop, so it stays cached. The database does not:
// a stale read would make the admin panel look broken right after publishing.
let sheetCache: EventCache | null = null;

async function getEventsFromSheet(): Promise<Event[]> {
  const now = Date.now();

  if (sheetCache && now - sheetCache.lastFetched < CACHE_TTL_MS) {
    return sheetCache.data;
  }

  try {
    const events = await fetchEventsFromSheet();
    sheetCache = { data: events, lastFetched: now };
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    return sheetCache?.data ?? [];
  }
}

export async function getEvents(): Promise<Event[]> {
  if (CONTENT_SOURCE === 'db') {
    try {
      return await fetchEventsFromDb(db);
    } catch (error) {
      console.error('Error reading events from database:', error);
      return [];
    }
  }
  return getEventsFromSheet();
}

export async function getEvent(slug: string): Promise<Event | undefined> {
  if (CONTENT_SOURCE === 'db') {
    try {
      return await fetchEventFromDb(db, slug);
    } catch (error) {
      console.error('Error reading event from database:', error);
      return undefined;
    }
  }
  const events = await getEventsFromSheet();
  return events.find((e) => e.slug === slug);
}
