import { describe, expect, it } from 'vitest';

import { toEvent, toJob, type StrapiEvent, type StrapiJob } from './map';

const aStrapiEvent = (overrides: Partial<StrapiEvent> = {}): StrapiEvent => ({
  id: 1,
  documentId: 'abc',
  title: 'Open Source Day',
  slug: 'open-source-day',
  start_date: '2026-03-14T10:00:00.000Z',
  end_date: '2026-03-14T13:00:00.000Z',
  link: 'https://example.com/osd',
  location: 'Ahmedabad',
  event_type: 'In-person',
  description: 'A day of open source.',
  ...overrides,
});

const aStrapiJob = (overrides: Partial<StrapiJob> = {}): StrapiJob => ({
  id: 1,
  documentId: 'xyz',
  title: 'Platform Engineer',
  job_slug: 'acme-platform-engineer',
  apply_link: 'https://acme.test/apply',
  posted_on: '2026-02-01',
  job_status: 'Open',
  ...overrides,
});

describe('toEvent', () => {
  it('maps a Strapi event onto the domain event the pages already render', () => {
    const event = toEvent(aStrapiEvent());

    expect(event).toMatchObject({
      title: 'Open Source Day',
      slug: 'open-source-day',
      startDate: '2026-03-14T10:00:00.000Z',
      endDate: '2026-03-14T13:00:00.000Z',
      link: 'https://example.com/osd',
      location: 'Ahmedabad',
      description: 'A day of open source.',
    });
  });

  it('splits event_type into an attendance mode, matching how the sheet used it', () => {
    expect(toEvent(aStrapiEvent({ event_type: 'In-person' }))).toMatchObject({
      type: 'Meetup',
      attendanceMode: 'In-person',
    });
    expect(toEvent(aStrapiEvent({ event_type: 'Online' })).attendanceMode).toBe('Online');
  });

  it('reads event_type as an event kind when it names one', () => {
    const event = toEvent(aStrapiEvent({ event_type: 'Conference' }));

    expect(event.type).toBe('Conference');
    expect(event.attendanceMode).toBeUndefined();
  });

  it('treats a CFP status of NA as no call for papers', () => {
    expect(toEvent(aStrapiEvent({ cfp_status: 'NA' })).cfpStatus).toBeUndefined();
    expect(toEvent(aStrapiEvent({ cfp_status: 'Open' })).cfpStatus).toBe('Open');
  });

  it('maps speaker components, using the speaker link where the sheet had an avatar', () => {
    const event = toEvent(
      aStrapiEvent({
        speakers: [
          { id: 1, name: 'Ada', role: 'Maintainer', company: 'Acme', link: 'https://a.test' },
        ],
      }),
    );

    expect(event.speakers).toEqual([
      { name: 'Ada', role: 'Maintainer', company: 'Acme', avatar: 'https://a.test' },
    ]);
  });

  it('maps agenda components in order', () => {
    const event = toEvent(
      aStrapiEvent({
        agenda: [
          { id: 1, time: '10:00', activity: 'Intro' },
          { id: 2, time: '11:00', activity: 'Talk' },
        ],
      }),
    );

    expect(event.agenda).toEqual([
      { time: '10:00', activity: 'Intro' },
      { time: '11:00', activity: 'Talk' },
    ]);
  });

  it('flattens the tag relation to names', () => {
    const event = toEvent(
      aStrapiEvent({
        event_tags: [
          { id: 1, name: 'linux', slug: 'linux' },
          { id: 2, name: 'rust', slug: 'rust' },
        ],
      }),
    );

    expect(event.tags).toEqual(['linux', 'rust']);
  });

  it('substitutes empty collections when relations were not populated', () => {
    const event = toEvent(aStrapiEvent());

    expect(event.tags).toEqual([]);
    expect(event.speakers).toEqual([]);
    expect(event.agenda).toEqual([]);
    expect(event.images).toEqual([]);
  });

  it('tolerates a missing end date rather than rendering "Invalid Date"', () => {
    expect(toEvent(aStrapiEvent({ end_date: null })).endDate).toBe('');
  });
});

describe('toJob', () => {
  it('maps a Strapi job onto the domain job the pages already render', () => {
    const job = toJob(aStrapiJob({ experience: '3+ years', job_type: 'Full Time', openings: 2 }));

    expect(job).toMatchObject({
      title: 'Platform Engineer',
      jobSlug: 'acme-platform-engineer',
      applyLink: 'https://acme.test/apply',
      experience: '3+ years',
      jobType: 'Full Time',
      status: 'Open',
      openings: '2',
    });
    expect(job.postedOn).toBeInstanceOf(Date);
  });

  it('reads the company name, website and description out of the relation', () => {
    const job = toJob(
      aStrapiJob({
        company: {
          id: 1,
          name: 'Acme',
          slug: 'acme',
          website: 'https://acme.test',
          about: 'Acme builds things.',
        },
      }),
    );

    expect(job.company).toBe('Acme');
    expect(job.companyWebsite).toBe('https://acme.test');
    expect(job.aboutCompany).toBe('Acme builds things.');
  });

  it('renders a job whose company relation is missing rather than crashing', () => {
    const job = toJob(aStrapiJob({ company: null }));

    expect(job.company).toBe('');
    expect(job.aboutCompany).toBe('');
  });

  it('flattens the skills relation to names', () => {
    const job = toJob(
      aStrapiJob({
        skills: [
          { id: 1, name: 'TypeScript', slug: 'typescript' },
          { id: 2, name: 'Postgres', slug: 'postgres' },
        ],
      }),
    );

    expect(job.skills).toEqual(['TypeScript', 'Postgres']);
  });

  it('maps job_status case insensitively and defaults to Open', () => {
    expect(toJob(aStrapiJob({ job_status: 'closed' })).status).toBe('Closed');
    expect(toJob(aStrapiJob({ job_status: 'Closed' })).status).toBe('Closed');
    expect(toJob(aStrapiJob({ job_status: null })).status).toBe('Open');
  });

  it('defaults openings to one when the field is empty', () => {
    expect(toJob(aStrapiJob({ openings: null })).openings).toBe('1');
  });
});
