import { GOOGLE_EVENTS_SHEET_URL } from 'astro:env/server';

import { parseEventsCsv } from './parse';
import type { Event } from './types';

export { parseAgenda, parseSpeakers, slugify } from './parse';

async function fetchRawCSV(): Promise<string> {
  if (!GOOGLE_EVENTS_SHEET_URL) {
    throw new Error('GOOGLE_EVENTS_SHEET_URL environment variable is not set');
  }

  const fetchUrl = new URL(GOOGLE_EVENTS_SHEET_URL);
  fetchUrl.searchParams.set('t', Date.now().toString());

  const response = await fetch(fetchUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch events sheet: ${response.statusText}`);
  }
  return await response.text();
}

/** Reads every event from the published Google Sheet. Throws if the sheet is unreachable. */
export async function fetchEventsFromSheet(): Promise<Event[]> {
  return parseEventsCsv(await fetchRawCSV());
}
