import { eq, inArray } from 'drizzle-orm';

import type { Database } from '../../db';
import { tag } from '../../db/schema/community';
import {
  event,
  eventAgendaItem,
  eventImage,
  eventSpeaker,
  eventTag,
  job,
  jobSkill,
} from '../../db/schema/content';
import type { Event } from '../events/types';
import type { Job } from '../jobs/types';

export interface ImportReport {
  inserted: number;
  updated: number;
  skipped: number;
  skippedReasons: string[];
}

export interface ImportOptions {
  /** Validate and report without writing anything. */
  dryRun?: boolean;
}

const emptyReport = (): ImportReport => ({
  inserted: 0,
  updated: 0,
  skipped: 0,
  skippedReasons: [],
});

const parseDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const slugifyTag = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

/** Returns tag ids for the given names, creating any that do not exist yet. */
const upsertTags = async (
  db: Database,
  names: readonly string[],
  kind: 'topic' | 'skill',
): Promise<number[]> => {
  const unique = [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))];
  if (unique.length === 0) return [];

  const slugs = unique.map(slugifyTag);

  await db
    .insert(tag)
    .values(unique.map((name, index) => ({ slug: slugs[index]!, name, kind })))
    .onConflictDoNothing({ target: tag.slug });

  const rows = await db.select({ id: tag.id }).from(tag).where(inArray(tag.slug, slugs));
  return rows.map((row) => row.id);
};

const cfpStatusOf = (value: string | undefined): 'none' | 'Open' | 'Closed' => {
  if (value === 'Open' || value === 'Closed') return value;
  return 'none';
};

export const importEvents = async (
  db: Database,
  events: readonly Event[],
  options: ImportOptions = {},
): Promise<ImportReport> => {
  const report = emptyReport();

  for (const incoming of events) {
    const slug = incoming.slug?.trim();
    if (!slug) {
      report.skipped += 1;
      report.skippedReasons.push(`"${incoming.title}" has no slug`);
      continue;
    }

    const startDate = parseDate(incoming.startDate);
    if (!startDate) {
      report.skipped += 1;
      report.skippedReasons.push(`"${slug}" has an unparseable start date`);
      continue;
    }

    const existing = await db.select({ id: event.id }).from(event).where(eq(event.slug, slug));
    const isUpdate = existing.length > 0;

    if (options.dryRun) {
      if (isUpdate) report.updated += 1;
      else report.inserted += 1;
      continue;
    }

    const values = {
      slug,
      title: incoming.title,
      startDate,
      endDate: parseDate(incoming.endDate),
      link: incoming.link || null,
      location: incoming.location ?? null,
      venue: incoming.venue ?? null,
      venueName: incoming.venue_name ?? null,
      venueMap: incoming.venue_map ?? null,
      type: incoming.type ?? 'Meetup',
      attendanceMode: incoming.attendanceMode ?? null,
      description: incoming.description ?? null,
      longDescription: incoming.long_description ?? null,
      community: incoming.community ?? null,
      cfpStatus: cfpStatusOf(incoming.cfpStatus),
      cfpEndDate: parseDate(incoming.cfpEndDate),
      featured: incoming.featured ?? false,
      updatedAt: new Date(),
    } as const;

    const [row] = await db
      .insert(event)
      .values(values)
      .onConflictDoUpdate({ target: event.slug, set: values })
      .returning({ id: event.id });

    const eventId = row!.id;

    // Child rows are replaced rather than merged: the sheet is the whole truth
    // for this import, and merging would leave deleted speakers behind.
    await db.delete(eventImage).where(eq(eventImage.eventId, eventId));
    await db.delete(eventSpeaker).where(eq(eventSpeaker.eventId, eventId));
    await db.delete(eventAgendaItem).where(eq(eventAgendaItem.eventId, eventId));
    await db.delete(eventTag).where(eq(eventTag.eventId, eventId));

    if (incoming.images?.length) {
      await db
        .insert(eventImage)
        .values(incoming.images.map((url, position) => ({ eventId, url, position })));
    }

    if (incoming.speakers?.length) {
      await db.insert(eventSpeaker).values(
        incoming.speakers.map((speaker, position) => ({
          eventId,
          name: speaker.name,
          role: speaker.role || null,
          company: speaker.company ?? null,
          avatar: speaker.avatar ?? null,
          position,
        })),
      );
    }

    if (incoming.agenda?.length) {
      await db.insert(eventAgendaItem).values(
        incoming.agenda.map((item, position) => ({
          eventId,
          time: item.time,
          activity: item.activity,
          position,
        })),
      );
    }

    const tagIds = await upsertTags(db, incoming.tags ?? [], 'topic');
    if (tagIds.length > 0) {
      await db.insert(eventTag).values(tagIds.map((tagId) => ({ eventId, tagId })));
    }

    if (isUpdate) report.updated += 1;
    else report.inserted += 1;
  }

  return report;
};

export const importJobs = async (
  db: Database,
  jobs: readonly Job[],
  options: ImportOptions = {},
): Promise<ImportReport> => {
  const report = emptyReport();

  for (const incoming of jobs) {
    const slug = incoming.jobSlug?.trim();
    if (!slug) {
      report.skipped += 1;
      report.skippedReasons.push(`"${incoming.title}" has no slug`);
      continue;
    }
    if (!incoming.applyLink?.trim()) {
      report.skipped += 1;
      report.skippedReasons.push(`"${slug}" has no apply link`);
      continue;
    }

    const existing = await db.select({ id: job.id }).from(job).where(eq(job.slug, slug));
    const isUpdate = existing.length > 0;

    if (options.dryRun) {
      if (isUpdate) report.updated += 1;
      else report.inserted += 1;
      continue;
    }

    const values = {
      slug,
      title: incoming.title,
      company: incoming.company,
      companyWebsite: incoming.companyWebsite || null,
      applyLink: incoming.applyLink,
      experience: incoming.experience || null,
      jobType: incoming.jobType || null,
      jobMode: incoming.jobMode || null,
      location: incoming.location || null,
      openings: incoming.openings || '1',
      descriptionMd: incoming.description ?? '',
      aboutCompany: incoming.aboutCompany || null,
      featured: incoming.featured ?? false,
      status: incoming.status === 'Closed' ? ('closed' as const) : ('open' as const),
      postedOn: incoming.postedOn instanceof Date ? incoming.postedOn : new Date(),
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(job)
      .values(values)
      .onConflictDoUpdate({ target: job.slug, set: values })
      .returning({ id: job.id });

    const jobId = row!.id;

    await db.delete(jobSkill).where(eq(jobSkill.jobId, jobId));
    const tagIds = await upsertTags(db, incoming.skills ?? [], 'skill');
    if (tagIds.length > 0) {
      await db.insert(jobSkill).values(tagIds.map((tagId) => ({ jobId, tagId })));
    }

    if (isUpdate) report.updated += 1;
    else report.inserted += 1;
  }

  return report;
};
