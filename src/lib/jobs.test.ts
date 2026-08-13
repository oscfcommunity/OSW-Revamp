import { describe, expect, it } from 'vitest';

import { parseJobsCsv } from './jobs/parse';
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

// Parsing is pure, so these tests need no environment and no network: they
// exercise parseJobsCsv directly rather than the sheet-fetching wrapper.
const loadJobs = (rows: readonly JobRow[]): readonly Job[] => parseJobsCsv(asCsv(rows));

describe('getJobs', () => {
  it('maps a sheet row to a job', () => {
    const [job] = loadJobs([aJobRow()]);

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

  it('prefers the Job Description column over the description column', () => {
    const [job] = loadJobs([aJobRow({ description: 'short', 'Job Description': 'the long one' })]);

    expect(job?.description).toBe('the long one');
  });

  it('falls back to the description column when Job Description is empty', () => {
    const [job] = loadJobs([aJobRow({ description: 'short', 'Job Description': '' })]);

    expect(job?.description).toBe('short');
  });

  it('reads the status case insensitively and defaults to Open', () => {
    const [closed, blank] = loadJobs([
      aJobRow({ jobSlug: 'a', Status: ' CLOSED ' }),
      aJobRow({ jobSlug: 'b', Status: '' }),
    ]);

    expect(closed?.status).toBe('Closed');
    expect(blank?.status).toBe('Open');
  });

  it('strips wrapping quotes from skills', () => {
    const [job] = loadJobs([aJobRow({ skills: '"Go", "Kubernetes"' })]);

    expect(job?.skills).toEqual(['Go', 'Kubernetes']);
  });

  it('defaults openings to a single opening when the sheet leaves it blank', () => {
    const [job] = loadJobs([aJobRow({ openings: '' })]);

    expect(job?.openings).toBe('1');
  });

  it('drops rows without a title or a slug', () => {
    const jobs = loadJobs([
      aJobRow({ jobSlug: 'keeper' }),
      aJobRow({ jobSlug: '' }),
      aJobRow({ jobSlug: 'no-title', title: '' }),
    ]);

    expect(jobs.map((job) => job.jobSlug)).toEqual(['keeper']);
  });
});

describe('finding one job', () => {
  it('finds a job by slug', () => {
    const jobs = loadJobs([aJobRow({ jobSlug: 'wanted' }), aJobRow({ jobSlug: 'other' })]);

    expect(jobs.find((job) => job.jobSlug === 'wanted')).toMatchObject({ jobSlug: 'wanted' });
  });

  it('finds nothing for an unknown slug', () => {
    const jobs = loadJobs([aJobRow({ jobSlug: 'wanted' })]);

    expect(jobs.find((job) => job.jobSlug === 'missing')).toBeUndefined();
  });
});
