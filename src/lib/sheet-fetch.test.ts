import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The sheet-fetching wrappers, as opposed to the parsing they delegate to.
 *
 * `astro:env` resolves its values when the config is loaded, so a developer's
 * local .env would otherwise decide whether these pass — which is exactly how a
 * green local run turned into a red CI run. Mocking the module makes the
 * environment explicit and identical everywhere.
 */
vi.mock('astro:env/server', () => ({
  GOOGLE_EVENTS_SHEET_URL: 'https://sheets.test/events.csv',
  GOOGLE_JOBS_SHEET_URL: 'https://sheets.test/jobs.csv',
  CONTENT_SOURCE: 'sheet',
}));

const respondWith = (status: number, body: string): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, statusText: 'Server Error' })),
  );
};

describe('fetchEventsFromSheet', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the CSV the sheet returns', async () => {
    respondWith(200, 'title,slug,startDate,endDate\nOSW Meetup,osw,2026-03-14,2026-03-14');
    const { fetchEventsFromSheet } = await import('./events/sheet');

    await expect(fetchEventsFromSheet()).resolves.toMatchObject([{ slug: 'osw' }]);
  });

  it('reports a failure to reach the sheet rather than pretending there are no events', async () => {
    respondWith(500, 'nope');
    const { fetchEventsFromSheet } = await import('./events/sheet');

    await expect(fetchEventsFromSheet()).rejects.toThrow(/Failed to fetch events sheet/);
  });
});

describe('fetchJobsFromSheet', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the CSV the sheet returns', async () => {
    respondWith(200, 'title,jobSlug,applyLink\nEngineer,acme-engineer,https://acme.test/a');
    const { fetchJobsFromSheet } = await import('./jobs/sheet');

    await expect(fetchJobsFromSheet()).resolves.toMatchObject([{ jobSlug: 'acme-engineer' }]);
  });

  it('reports a failure to reach the sheet rather than pretending there are no jobs', async () => {
    respondWith(500, 'nope');
    const { fetchJobsFromSheet } = await import('./jobs/sheet');

    await expect(fetchJobsFromSheet()).rejects.toThrow(/Failed to fetch sheet/);
  });
});
