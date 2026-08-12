import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Event } from './events/types';

const EVENT_HEADERS = [
  'title',
  'slug',
  'startDate',
  'endDate',
  'link',
  'location',
  'type',
  'description',
  'long_description',
  'venue_name',
  'venue_map',
  'images',
  'speaker_data',
  'agenda',
  'community',
  'cfpStatus',
  'cfpEndDate',
  'tags',
  'venue',
  'featured',
] as const;

type EventRow = Partial<Record<(typeof EVENT_HEADERS)[number], string>>;

const anEventRow = (overrides: EventRow = {}): EventRow => ({
  title: 'Open Source Weekend Meetup',
  slug: 'osw-meetup',
  startDate: '2026-03-14T10:00:00Z',
  endDate: '2026-03-14T13:00:00Z',
  link: 'https://example.com/osw-meetup',
  location: 'Ahmedabad',
  type: 'Meetup',
  description: 'A weekend of open source.',
  ...overrides,
});

const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const asCsv = (rows: readonly EventRow[]): string =>
  [
    EVENT_HEADERS.join(','),
    ...rows.map((row) => EVENT_HEADERS.map((header) => quote(row[header] ?? '')).join(',')),
  ].join('\n');

const respondWithCsv = (csv: string): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(csv, { status: 200 })),
  );
};

const loadEvents = async (rows: readonly EventRow[]): Promise<readonly Event[]> => {
  respondWithCsv(asCsv(rows));
  const { fetchEventsFromSheet } = await import('./events/sheet');
  return fetchEventsFromSheet();
};

describe('getEvents', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a sheet row to an event', async () => {
    const [event] = await loadEvents([anEventRow()]);

    expect(event).toMatchObject({
      title: 'Open Source Weekend Meetup',
      slug: 'osw-meetup',
      startDate: '2026-03-14T10:00:00Z',
      endDate: '2026-03-14T13:00:00Z',
      link: 'https://example.com/osw-meetup',
      location: 'Ahmedabad',
      type: 'Meetup',
      description: 'A weekend of open source.',
    });
  });

  it('derives a slug from the title and start year when the sheet omits one', async () => {
    const [event] = await loadEvents([
      anEventRow({ slug: '', title: 'Hack the Weekend!', startDate: '2026-03-14T10:00:00Z' }),
    ]);

    expect(event?.slug).toBe('hack-the-weekend-2026');
  });

  it('defaults the type to Meetup when the sheet leaves it blank', async () => {
    const [event] = await loadEvents([anEventRow({ type: '' })]);

    expect(event?.type).toBe('Meetup');
  });

  it('reads an attendance mode out of the type column, which is what the sheet records there', async () => {
    const [inPerson, hybrid, online] = await loadEvents([
      anEventRow({ slug: 'a', type: 'In-person' }),
      anEventRow({ slug: 'b', type: 'Hybrid' }),
      anEventRow({ slug: 'c', type: 'Online' }),
    ]);

    expect(inPerson?.attendanceMode).toBe('In-person');
    expect(hybrid?.attendanceMode).toBe('Hybrid');
    expect(online?.attendanceMode).toBe('Online');
  });

  it('keeps the event kind out of the attendance mode when the sheet records a kind', async () => {
    const [event] = await loadEvents([anEventRow({ type: 'Conference' })]);

    expect(event?.type).toBe('Conference');
    expect(event?.attendanceMode).toBeUndefined();
  });

  it('treats a CFP status of NA as no call for papers', async () => {
    const [event] = await loadEvents([anEventRow({ cfpStatus: 'NA' })]);

    expect(event?.cfpStatus).toBeUndefined();
  });

  it('splits comma separated images and tags, ignoring blanks', async () => {
    const [event] = await loadEvents([
      anEventRow({ images: 'https://a.png , ,https://b.png', tags: 'linux, , rust' }),
    ]);

    expect(event?.images).toEqual(['https://a.png', 'https://b.png']);
    expect(event?.tags).toEqual(['linux', 'rust']);
  });

  it('parses pipe separated speakers as name, role and avatar', async () => {
    const [event] = await loadEvents([
      anEventRow({ speaker_data: 'Ada:Maintainer:https://a.png | Lin:Speaker' }),
    ]);

    expect(event?.speakers).toEqual([
      { name: 'Ada', role: 'Maintainer', avatar: 'https://a.png' },
      { name: 'Lin', role: 'Speaker', avatar: undefined },
    ]);
  });

  it('parses semicolon separated agenda items, keeping clock times intact', async () => {
    const [event] = await loadEvents([
      anEventRow({ agenda: '10:00:Intro ; 11:00 AM:Talk: why open source ; Evening:Dinner' }),
    ]);

    expect(event?.agenda).toEqual([
      { time: '10:00', activity: 'Intro' },
      { time: '11:00 AM', activity: 'Talk: why open source' },
      { time: 'Evening', activity: 'Dinner' },
    ]);
  });

  it('treats featured as true only for the literal TRUE value', async () => {
    const [featured, notFeatured] = await loadEvents([
      anEventRow({ slug: 'a', featured: 'true' }),
      anEventRow({ slug: 'b', featured: 'no' }),
    ]);

    expect(featured?.featured).toBe(true);
    expect(notFeatured?.featured).toBe(false);
  });

  it('drops rows without a title or a start date', async () => {
    const events = await loadEvents([
      anEventRow({ slug: 'keeper' }),
      anEventRow({ slug: 'no-title', title: '' }),
      anEventRow({ slug: 'no-date', startDate: '' }),
    ]);

    expect(events.map((event) => event.slug)).toEqual(['keeper']);
  });

  it('reports a failure to reach the sheet rather than pretending there are no events', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' })),
    );
    const { fetchEventsFromSheet } = await import('./events/sheet');

    await expect(fetchEventsFromSheet()).rejects.toThrow(/Failed to fetch events sheet/);
  });
});

describe('finding one event', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds an event by slug', async () => {
    const events = await loadEvents([
      anEventRow({ slug: 'wanted' }),
      anEventRow({ slug: 'other' }),
    ]);

    expect(events.find((event) => event.slug === 'wanted')).toMatchObject({ slug: 'wanted' });
  });

  it('finds nothing for an unknown slug', async () => {
    const events = await loadEvents([anEventRow({ slug: 'wanted' })]);

    expect(events.find((event) => event.slug === 'missing')).toBeUndefined();
  });
});
