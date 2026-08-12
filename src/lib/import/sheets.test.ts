import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase, type TestDatabase } from '../../../tests/helpers/db';
import { importEvents, importJobs } from './sheets';
import type { Event } from '../events/types';
import type { Job } from '../jobs/types';
import { fetchEventFromDb, fetchEventsFromDb } from '../events/repo';
import { fetchJobsFromDb } from '../jobs/repo';

const anEvent = (overrides: Partial<Event> = {}): Event => ({
  title: 'Open Source Day',
  slug: 'open-source-day',
  startDate: '2026-03-14T10:00:00.000Z',
  endDate: '2026-03-14T13:00:00.000Z',
  link: 'https://example.com/osd',
  location: 'Ahmedabad',
  type: 'Meetup',
  description: 'A day of open source.',
  images: [],
  speakers: [],
  agenda: [],
  tags: [],
  featured: false,
  ...overrides,
});

const aJob = (overrides: Partial<Job> = {}): Job => ({
  title: 'Platform Engineer',
  company: 'Acme',
  jobSlug: 'acme-platform-engineer',
  featured: false,
  skills: [],
  experience: '3+ years',
  jobType: 'Full Time',
  jobMode: 'Remote',
  location: 'Ahmedabad',
  companyWebsite: 'https://acme.test',
  applyLink: 'https://acme.test/apply',
  postedOn: new Date('2026-02-01T00:00:00.000Z'),
  description: '## Role',
  aboutCompany: 'Acme builds things.',
  status: 'Open',
  openings: '2',
  ...overrides,
});

describe('importEvents', () => {
  let db: TestDatabase;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDatabase());
  });

  afterEach(async () => {
    await close();
  });

  it('imports an event and reads back the same domain object', async () => {
    const report = await importEvents(db, [anEvent()]);

    expect(report).toMatchObject({ inserted: 1, updated: 0, skipped: 0 });

    const stored = await fetchEventsFromDb(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      title: 'Open Source Day',
      slug: 'open-source-day',
      startDate: '2026-03-14T10:00:00.000Z',
      location: 'Ahmedabad',
      type: 'Meetup',
    });
  });

  it('normalises packed speakers, agenda, images and tags into their own rows', async () => {
    await importEvents(db, [
      anEvent({
        images: ['https://a.png', 'https://b.png'],
        speakers: [{ name: 'Ada', role: 'Maintainer', avatar: 'https://a.png' }],
        agenda: [
          { time: '10:00', activity: 'Intro' },
          { time: '11:00', activity: 'Talk' },
        ],
        tags: ['linux', 'rust'],
      }),
    ]);

    const stored = await fetchEventFromDb(db, 'open-source-day');

    expect(stored?.images).toEqual(['https://a.png', 'https://b.png']);
    expect(stored?.speakers).toEqual([
      { name: 'Ada', role: 'Maintainer', avatar: 'https://a.png', company: undefined },
    ]);
    expect(stored?.agenda).toEqual([
      { time: '10:00', activity: 'Intro' },
      { time: '11:00', activity: 'Talk' },
    ]);
    expect(stored?.tags).toEqual(['linux', 'rust']);
  });

  it('is idempotent: re-importing updates in place rather than duplicating', async () => {
    await importEvents(db, [anEvent()]);
    const report = await importEvents(db, [anEvent({ title: 'Open Source Day 2026' })]);

    expect(report).toMatchObject({ inserted: 0, updated: 1 });

    const stored = await fetchEventsFromDb(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.title).toBe('Open Source Day 2026');
  });

  it('replaces child rows on re-import instead of appending to them', async () => {
    await importEvents(db, [anEvent({ tags: ['linux'], images: ['https://a.png'] })]);
    await importEvents(db, [anEvent({ tags: ['rust'], images: ['https://b.png'] })]);

    const stored = await fetchEventFromDb(db, 'open-source-day');
    expect(stored?.tags).toEqual(['rust']);
    expect(stored?.images).toEqual(['https://b.png']);
  });

  it('reuses one tag row across events rather than creating duplicates', async () => {
    await importEvents(db, [
      anEvent({ slug: 'a', tags: ['linux'] }),
      anEvent({ slug: 'b', tags: ['linux'] }),
    ]);

    const stored = await fetchEventsFromDb(db);
    expect(stored.map((event) => event.tags)).toEqual([['linux'], ['linux']]);
  });

  it('skips events with no slug or an unparseable start date', async () => {
    const report = await importEvents(db, [
      anEvent({ slug: 'good' }),
      anEvent({ slug: '', title: 'No slug' }),
      anEvent({ slug: 'bad-date', startDate: 'not a date' }),
    ]);

    expect(report.inserted).toBe(1);
    expect(report.skipped).toBe(2);
    expect(report.skippedReasons).toHaveLength(2);
  });

  it('writes nothing in dry run mode but still reports what it would do', async () => {
    const report = await importEvents(db, [anEvent()], { dryRun: true });

    expect(report.inserted).toBe(1);
    await expect(fetchEventsFromDb(db)).resolves.toEqual([]);
  });
});

describe('importJobs', () => {
  let db: TestDatabase;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDatabase());
  });

  afterEach(async () => {
    await close();
  });

  it('imports a job and reads back the same domain object', async () => {
    const report = await importJobs(db, [aJob({ skills: ['TypeScript', 'Postgres'] })]);

    expect(report).toMatchObject({ inserted: 1, skipped: 0 });

    const [stored] = await fetchJobsFromDb(db);
    expect(stored).toMatchObject({
      title: 'Platform Engineer',
      company: 'Acme',
      jobSlug: 'acme-platform-engineer',
      status: 'Open',
      openings: '2',
      description: '## Role',
    });
    expect(stored?.skills).toEqual(['TypeScript', 'Postgres']);
  });

  it('maps a closed job onto the closed status', async () => {
    await importJobs(db, [aJob({ status: 'Closed' })]);

    const [stored] = await fetchJobsFromDb(db);
    expect(stored?.status).toBe('Closed');
  });

  it('is idempotent on the job slug', async () => {
    await importJobs(db, [aJob()]);
    const report = await importJobs(db, [aJob({ title: 'Senior Platform Engineer' })]);

    expect(report).toMatchObject({ inserted: 0, updated: 1 });
    const stored = await fetchJobsFromDb(db);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.title).toBe('Senior Platform Engineer');
  });

  it('skips jobs without a slug or an apply link', async () => {
    const report = await importJobs(db, [
      aJob({ jobSlug: 'good' }),
      aJob({ jobSlug: '' }),
      aJob({ jobSlug: 'no-apply', applyLink: '' }),
    ]);

    expect(report.inserted).toBe(1);
    expect(report.skipped).toBe(2);
  });
});
