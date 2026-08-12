import { fetchCollection } from '../strapi/client';
import { toJob, type StrapiJob } from '../strapi/map';
import type { Job } from './types';

const POPULATE = {
  'populate[0]': 'company',
  'populate[1]': 'skills',
  'sort[0]': 'posted_on:desc',
} as const;

export const fetchJobsFromStrapi = async (): Promise<Job[]> => {
  const rows = await fetchCollection<StrapiJob>('jobs', { ...POPULATE });
  return rows.map(toJob);
};

export const fetchJobFromStrapi = async (slug: string): Promise<Job | undefined> => {
  const rows = await fetchCollection<StrapiJob>('jobs', {
    ...POPULATE,
    'filters[job_slug][$eq]': slug,
  });
  const row = rows[0];
  return row ? toJob(row) : undefined;
};
