import { GOOGLE_JOBS_SHEET_URL } from 'astro:env/server';

import { parseJobsCsv } from './parse';
import type { Job } from './types';

async function fetchRawCSV(): Promise<string> {
  if (!GOOGLE_JOBS_SHEET_URL) {
    throw new Error('GOOGLE_JOBS_SHEET_URL environment variable is not set');
  }

  const fetchUrl = new URL(GOOGLE_JOBS_SHEET_URL);
  fetchUrl.searchParams.set('t', Date.now().toString());

  const response = await fetch(fetchUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  return await response.text();
}

/** Reads every job from the published Google Sheet. Throws if the sheet is unreachable. */
export async function fetchJobsFromSheet(): Promise<Job[]> {
  return parseJobsCsv(await fetchRawCSV());
}
