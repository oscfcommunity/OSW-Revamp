import { CONTENT_SOURCE } from 'astro:env/server';

import { db } from '../db';
import { fetchJobFromDb, fetchJobsFromDb } from './jobs/repo';
import { fetchJobsFromSheet } from './jobs/sheet';
import type { Job } from './jobs/types';

export type { Job } from './jobs/types';

/**
 * Public API. Signatures are frozen: pages and components call these and must not
 * know whether the data came from the Google Sheet or from Postgres.
 */

const CACHE_TTL_MS = 60 * 1000;

interface JobCache {
  data: Job[];
  lastFetched: number;
}

let sheetCache: JobCache | null = null;

async function getJobsFromSheet(): Promise<Job[]> {
  const now = Date.now();

  if (sheetCache && now - sheetCache.lastFetched < CACHE_TTL_MS) {
    return sheetCache.data;
  }

  try {
    const jobs = await fetchJobsFromSheet();
    sheetCache = { data: jobs, lastFetched: now };
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    if (sheetCache) {
      console.warn('Serving stale cache due to fetch error');
      return sheetCache.data;
    }
    return [];
  }
}

export async function getJobs(): Promise<Job[]> {
  if (CONTENT_SOURCE === 'db') {
    try {
      return await fetchJobsFromDb(db);
    } catch (error) {
      console.error('Error reading jobs from database:', error);
      return [];
    }
  }
  return getJobsFromSheet();
}

export async function getJob(slug: string): Promise<Job | undefined> {
  if (CONTENT_SOURCE === 'db') {
    try {
      return await fetchJobFromDb(db, slug);
    } catch (error) {
      console.error('Error reading job from database:', error);
      return undefined;
    }
  }
  const jobs = await getJobsFromSheet();
  return jobs.find((j) => j.jobSlug === slug);
}
