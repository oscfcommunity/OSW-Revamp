import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Job } from './jobs/types';

const JOB_HEADERS = [
  'title',
  'company',
  'jobSlug',
  'featured',
  'skills',
  'experience',
  'jobType',
  'jobMode',
  'location',
  'companyWebsite',
  'applyLink',
  'postedOn',
  'description',
  'About Company',
  'Job Description',
  'Status',
  'openings',
] as const;

type JobRow = Partial<Record<(typeof JOB_HEADERS)[number], string>>;

const aJobRow = (overrides: JobRow = {}): JobRow => ({
  title: 'Platform Engineer',
  company: 'Acme',
  jobSlug: 'acme-platform-engineer',
  featured: 'FALSE',
  skills: 'TypeScript, Postgres',
  experience: '3+ years',
  jobType: 'Full Time',
  jobMode: 'Remote',
  location: 'Ahmedabad',
  companyWebsite: 'https://acme.test',
  applyLink: 'https://acme.test/apply',
  postedOn: '2026-02-01',
  'Job Description': '## About the role',
  'About Company': 'Acme builds things.',
  Status: 'Open',
  openings: '2',
  ...overrides,
});

const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const asCsv = (rows: readonly JobRow[]): string =>
  [
    JOB_HEADERS.join(','),
    ...rows.map((row) => JOB_HEADERS.map((header) => quote(row[header] ?? '')).join(',')),
  ].join('\n');

const respondWithCsv = (csv: string): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(csv, { status: 200 })),
  );
};

const loadJobs = async (rows: readonly JobRow[]): Promise<readonly Job[]> => {
  respondWithCsv(asCsv(rows));
  const { fetchJobsFromSheet } = await import('./jobs/sheet');
  return fetchJobsFromSheet();
};

describe('getJobs', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a sheet row to a job', async () => {
    const [job] = await loadJobs([aJobRow()]);

    expect(job).toMatchObject({
      title: 'Platform Engineer',
      company: 'Acme',
      jobSlug: 'acme-platform-engineer',
      featured: false,
      skills: ['TypeScript', 'Postgres'],
      experience: '3+ years',
      jobType: 'Full Time',
      jobMode: 'Remote',
      location: 'Ahmedabad',
      applyLink: 'https://acme.test/apply',
      description: '## About the role',
      aboutCompany: 'Acme builds things.',
      status: 'Open',
      openings: '2',
    });
    expect(job?.postedOn).toBeInstanceOf(Date);
  });

  it('prefers the Job Description column over the description column', async () => {
    const [job] = await loadJobs([
      aJobRow({ description: 'short', 'Job Description': 'the long one' }),
    ]);

    expect(job?.description).toBe('the long one');
  });

  it('falls back to the description column when Job Description is empty', async () => {
    const [job] = await loadJobs([aJobRow({ description: 'short', 'Job Description': '' })]);

    expect(job?.description).toBe('short');
  });

  it('reads the status case insensitively and defaults to Open', async () => {
    const [closed, blank] = await loadJobs([
      aJobRow({ jobSlug: 'a', Status: ' CLOSED ' }),
      aJobRow({ jobSlug: 'b', Status: '' }),
    ]);

    expect(closed?.status).toBe('Closed');
    expect(blank?.status).toBe('Open');
  });

  it('strips wrapping quotes from skills', async () => {
    const [job] = await loadJobs([aJobRow({ skills: '"Go", "Kubernetes"' })]);

    expect(job?.skills).toEqual(['Go', 'Kubernetes']);
  });

  it('defaults openings to a single opening when the sheet leaves it blank', async () => {
    const [job] = await loadJobs([aJobRow({ openings: '' })]);

    expect(job?.openings).toBe('1');
  });

  it('drops rows without a title or a slug', async () => {
    const jobs = await loadJobs([
      aJobRow({ jobSlug: 'keeper' }),
      aJobRow({ jobSlug: '' }),
      aJobRow({ jobSlug: 'no-title', title: '' }),
    ]);

    expect(jobs.map((job) => job.jobSlug)).toEqual(['keeper']);
  });

  it('reports a failure to reach the sheet rather than pretending there are no jobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' })),
    );
    const { fetchJobsFromSheet } = await import('./jobs/sheet');

    await expect(fetchJobsFromSheet()).rejects.toThrow(/Failed to fetch sheet/);
  });
});

describe('finding one job', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds a job by slug', async () => {
    const jobs = await loadJobs([aJobRow({ jobSlug: 'wanted' }), aJobRow({ jobSlug: 'other' })]);

    expect(jobs.find((job) => job.jobSlug === 'wanted')).toMatchObject({ jobSlug: 'wanted' });
  });

  it('finds nothing for an unknown slug', async () => {
    const jobs = await loadJobs([aJobRow({ jobSlug: 'wanted' })]);

    expect(jobs.find((job) => job.jobSlug === 'missing')).toBeUndefined();
  });
});
