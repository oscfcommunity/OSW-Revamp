/**
 * One-off migration: read the published Google Sheets and create the matching
 * entries in Strapi.
 *
 *   npx tsx scripts/import-to-strapi.ts --dry-run
 *   npx tsx scripts/import-to-strapi.ts
 *
 * Reads STRAPI_URL, STRAPI_TOKEN, GOOGLE_EVENTS_SHEET_URL and
 * GOOGLE_JOBS_SHEET_URL from the environment (a local .env is loaded by Node's
 * --env-file, or export them yourself).
 *
 * Idempotent: entries are matched on slug and updated in place, so the script can
 * be re-run while the sheets are still being edited.
 */
import { parseEventsCsv } from '../src/lib/events/parse';
import { parseJobsCsv } from '../src/lib/jobs/parse';
import type { Event } from '../src/lib/events/types';
import type { Job } from '../src/lib/jobs/types';

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Draft & Publish is enabled on every content type in this CMS. A plain REST
 * create writes a DRAFT, and a read-only API token only ever sees published
 * entries — so an import without this would load hundreds of records that never
 * appear on the site. Strapi 5 accepts ?status=published on create and update to
 * write the published version directly.
 */
const PUBLISHED = 'published';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
};

const STRAPI_URL = required('STRAPI_URL').replace(/\/$/, '');
const STRAPI_TOKEN = required('STRAPI_TOKEN');

interface Report {
  created: number;
  updated: number;
  skipped: string[];
}

const api = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${STRAPI_URL}/api/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
};

type Entry = { id: number; documentId: string };
type ListResponse = { data: Entry[] };

const findByField = async (
  collection: string,
  field: string,
  value: string,
): Promise<Entry | undefined> => {
  // Look in the published version, which is what the site reads and what this
  // script writes.
  const query = new URLSearchParams({
    [`filters[${field}][$eq]`]: value,
    status: PUBLISHED,
  });
  const body = await api<ListResponse>(`${collection}?${query}`);
  return body.data[0];
};

const upsert = async (
  collection: string,
  field: string,
  value: string,
  data: Record<string, unknown>,
): Promise<{ documentId: string; created: boolean }> => {
  const existing = await findByField(collection, field, value);

  if (existing) {
    if (!DRY_RUN) {
      await api(`${collection}/${existing.documentId}?status=${PUBLISHED}`, {
        method: 'PUT',
        body: JSON.stringify({ data }),
      });
    }
    return { documentId: existing.documentId, created: false };
  }

  if (DRY_RUN) {
    return { documentId: 'dry-run', created: true };
  }

  const body = await api<{ data: Entry }>(`${collection}?status=${PUBLISHED}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  return { documentId: body.data.documentId, created: true };
};

const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

/** Resolves tag-like relations (skills, event tags), creating any that are new. */
const relationIds = async (collection: string, names: readonly string[]): Promise<string[]> => {
  const ids: string[] = [];

  for (const name of [...new Set(names.map((n) => n.trim()).filter(Boolean))]) {
    const slug = slugify(name);
    if (!slug) continue;
    const { documentId } = await upsert(collection, 'slug', slug, { name, slug });
    ids.push(documentId);
  }

  return ids;
};

const toStrapiDate = (value: string | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toStrapiDay = (value: string | undefined): string | null => {
  const iso = toStrapiDate(value);
  return iso ? iso.slice(0, 10) : null;
};

const importEvents = async (events: readonly Event[]): Promise<Report> => {
  const report: Report = { created: 0, updated: 0, skipped: [] };

  for (const event of events) {
    if (!event.slug || !toStrapiDate(event.startDate)) {
      report.skipped.push(`${event.title || '(untitled)'}: missing slug or start date`);
      continue;
    }

    const tagIds = DRY_RUN ? [] : await relationIds('event-tags', event.tags ?? []);

    // The CMS keeps one event_type field; the sheet's value goes back into it
    // unchanged so the CMS stays the readable record of what was published.
    const data = {
      title: event.title,
      slug: event.slug,
      start_date: toStrapiDate(event.startDate),
      end_date: toStrapiDate(event.endDate),
      link: event.link || null,
      location: event.location ?? null,
      event_type: event.attendanceMode ?? event.type ?? null,
      description: event.description ?? null,
      long_description: event.long_description ?? null,
      community: event.community ?? null,
      venue: event.venue ?? null,
      venue_name: event.venue_name ?? null,
      venue_map: event.venue_map ?? null,
      cfp_status: event.cfpStatus ?? 'NA',
      cfp_end_date: toStrapiDay(event.cfpEndDate),
      featured: event.featured ?? false,
      speakers: (event.speakers ?? []).map((speaker) => ({
        name: speaker.name,
        role: speaker.role || null,
        company: speaker.company ?? null,
        link: speaker.avatar ?? null,
      })),
      agenda: (event.agenda ?? []).map((item) => ({
        time: item.time || null,
        activity: item.activity || null,
      })),
      ...(tagIds.length > 0 ? { event_tags: tagIds } : {}),
    };

    try {
      const { created } = await upsert('events', 'slug', event.slug, data);
      if (created) report.created += 1;
      else report.updated += 1;
    } catch (error) {
      report.skipped.push(`${event.slug}: ${(error as Error).message}`);
    }
  }

  return report;
};

const importJobs = async (jobs: readonly Job[]): Promise<Report> => {
  const report: Report = { created: 0, updated: 0, skipped: [] };

  for (const job of jobs) {
    if (!job.jobSlug || !job.applyLink) {
      report.skipped.push(`${job.title || '(untitled)'}: missing slug or apply link`);
      continue;
    }

    try {
      let companyId: string | undefined;
      if (job.company && !DRY_RUN) {
        const company = await upsert('companies', 'slug', slugify(job.company), {
          name: job.company,
          slug: slugify(job.company),
          website: job.companyWebsite || null,
          about: job.aboutCompany || null,
        });
        companyId = company.documentId;
      }

      const skillIds = DRY_RUN ? [] : await relationIds('skills', job.skills ?? []);

      const data = {
        title: job.title,
        job_slug: job.jobSlug,
        apply_link: job.applyLink,
        posted_on: toStrapiDay(job.postedOn.toISOString()),
        experience: job.experience || null,
        job_type: job.jobType || null,
        job_mode: job.jobMode || null,
        location: job.location || null,
        description: job.description || null,
        job_status: job.status,
        openings: Number.parseInt(job.openings, 10) || 1,
        featured: job.featured,
        ...(companyId ? { company: companyId } : {}),
        ...(skillIds.length > 0 ? { skills: skillIds } : {}),
      };

      const { created } = await upsert('jobs', 'job_slug', job.jobSlug, data);
      if (created) report.created += 1;
      else report.updated += 1;
    } catch (error) {
      report.skipped.push(`${job.jobSlug}: ${(error as Error).message}`);
    }
  }

  return report;
};

const fetchCsv = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const summarise = (label: string, report: Report): void => {
  console.log(
    `${label}: ${report.created} created, ${report.updated} updated, ${report.skipped.length} skipped`,
  );
  for (const reason of report.skipped) {
    console.log(`  - ${reason}`);
  }
};

const run = async (): Promise<void> => {
  if (DRY_RUN) {
    console.log('Dry run: reading the sheets and Strapi, writing nothing.\n');
  }

  const [eventsCsv, jobsCsv] = await Promise.all([
    fetchCsv(required('GOOGLE_EVENTS_SHEET_URL')),
    fetchCsv(required('GOOGLE_JOBS_SHEET_URL')),
  ]);

  const events = parseEventsCsv(eventsCsv);
  const jobs = parseJobsCsv(jobsCsv);
  console.log(`Parsed ${events.length} events and ${jobs.length} jobs from the sheets.\n`);

  summarise('Events', await importEvents(events));
  summarise('Jobs', await importJobs(jobs));

  if (DRY_RUN) {
    console.log('\nNothing was written. Re-run without --dry-run to apply.');
  }
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
