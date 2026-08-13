import { CONTENT_SOURCE } from 'astro:env/server';

import { fetchJobFromStrapi, fetchJobsFromStrapi } from './jobs/strapi';
import { fetchJobsFromSheet } from './jobs/sheet';
import type { Job } from './jobs/types';

export type { Job } from './jobs/types';

/**
 * Public API. Signatures are frozen: pages and components call these and must not
 * know whether the data came from the Google Sheet or from the Strapi CMS.
 */

const CACHE_TTL_MS = 60 * 1000;

interface JobCache {
  data: Job[];
  lastFetched: number;
}

let cache: JobCache | null = null;

const load = async (): Promise<Job[]> =>
  CONTENT_SOURCE === 'strapi' ? fetchJobsFromStrapi() : fetchJobsFromSheet();

export async function getJobs(): Promise<Job[]> {
  const now = Date.now();

  if (cache && now - cache.lastFetched < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const jobs = await load();
    cache = { data: jobs, lastFetched: now };
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return cache?.data ?? [];
  }
}

export async function getJob(slug: string): Promise<Job | undefined> {
  if (CONTENT_SOURCE === 'strapi') {
    try {
      return await fetchJobFromStrapi(slug);
    } catch (error) {
      console.error('Error fetching job:', error);
      return undefined;
    }
  }

  const jobs = await getJobs();
  return jobs.find((j) => j.jobSlug === slug);
}
