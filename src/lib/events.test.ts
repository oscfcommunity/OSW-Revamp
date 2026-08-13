import { describe, expect, it } from 'vitest';

import { parseEventsCsv } from './events/parse';
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

// Parsing is pure, so these tests need no environment and no network: they
// exercise parseEventsCsv directly rather than the sheet-fetching wrapper.
const loadEvents = (rows: readonly EventRow[]): readonly Event[] => parseEventsCsv(asCsv(rows));

describe('getEvents', () => {
  it('maps a sheet row to an event', () => {
    const [event] = loadEvents([anEventRow()]);

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

  it('derives a slug from the title and start year when the sheet omits one', () => {
    const [event] = loadEvents([
      anEventRow({ slug: '', title: 'Hack the Weekend!', startDate: '2026-03-14T10:00:00Z' }),
    ]);

    expect(event?.slug).toBe('hack-the-weekend-2026');
  });

  it('defaults the type to Meetup when the sheet leaves it blank', () => {
    const [event] = loadEvents([anEventRow({ type: '' })]);

    expect(event?.type).toBe('Meetup');
  });

  it('reads an attendance mode out of the type column, which is what the sheet records there', () => {
    const [inPerson, hybrid, online] = loadEvents([
      anEventRow({ slug: 'a', type: 'In-person' }),
      anEventRow({ slug: 'b', type: 'Hybrid' }),
      anEventRow({ slug: 'c', type: 'Online' }),
    ]);

    expect(inPerson?.attendanceMode).toBe('In-person');
    expect(hybrid?.attendanceMode).toBe('Hybrid');
    expect(online?.attendanceMode).toBe('Online');
  });

  it('keeps the event kind out of the attendance mode when the sheet records a kind', () => {
    const [event] = loadEvents([anEventRow({ type: 'Conference' })]);

    expect(event?.type).toBe('Conference');
    expect(event?.attendanceMode).toBeUndefined();
  });

  it('treats a CFP status of NA as no call for papers', () => {
    const [event] = loadEvents([anEventRow({ cfpStatus: 'NA' })]);

    expect(event?.cfpStatus).toBeUndefined();
  });

  it('splits comma separated images and tags, ignoring blanks', () => {
    const [event] = loadEvents([
      anEventRow({ images: 'https://a.png , ,https://b.png', tags: 'linux, , rust' }),
    ]);

    expect(event?.images).toEqual(['https://a.png', 'https://b.png']);
    expect(event?.tags).toEqual(['linux', 'rust']);
  });

  it('parses pipe separated speakers as name, role and avatar', () => {
    const [event] = loadEvents([
      anEventRow({ speaker_data: 'Ada:Maintainer:https://a.png | Lin:Speaker' }),
    ]);

    expect(event?.speakers).toEqual([
      { name: 'Ada', role: 'Maintainer', avatar: 'https://a.png' },
      { name: 'Lin', role: 'Speaker', avatar: undefined },
    ]);
  });

  it('parses semicolon separated agenda items, keeping clock times intact', () => {
    const [event] = loadEvents([
      anEventRow({ agenda: '10:00:Intro ; 11:00 AM:Talk: why open source ; Evening:Dinner' }),
    ]);

    expect(event?.agenda).toEqual([
      { time: '10:00', activity: 'Intro' },
      { time: '11:00 AM', activity: 'Talk: why open source' },
      { time: 'Evening', activity: 'Dinner' },
    ]);
  });

  it('treats featured as true only for the literal TRUE value', () => {
    const [featured, notFeatured] = loadEvents([
      anEventRow({ slug: 'a', featured: 'true' }),
      anEventRow({ slug: 'b', featured: 'no' }),
    ]);

    expect(featured?.featured).toBe(true);
    expect(notFeatured?.featured).toBe(false);
  });

  it('drops rows without a title or a start date', () => {
    const events = loadEvents([
      anEventRow({ slug: 'keeper' }),
      anEventRow({ slug: 'no-title', title: '' }),
      anEventRow({ slug: 'no-date', startDate: '' }),
    ]);

    expect(events.map((event) => event.slug)).toEqual(['keeper']);
  });
});

describe('finding one event', () => {
  it('finds an event by slug', () => {
    const events = loadEvents([anEventRow({ slug: 'wanted' }), anEventRow({ slug: 'other' })]);

    expect(events.find((event) => event.slug === 'wanted')).toMatchObject({ slug: 'wanted' });
  });

  it('finds nothing for an unknown slug', () => {
    const events = loadEvents([anEventRow({ slug: 'wanted' })]);

    expect(events.find((event) => event.slug === 'missing')).toBeUndefined();
  });
});
