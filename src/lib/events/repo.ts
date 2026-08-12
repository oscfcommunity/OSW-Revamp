import { asc, eq, inArray } from 'drizzle-orm';

import { db as defaultDb, type Database } from '../../db';
import {
  event,
  eventAgendaItem,
  eventImage,
  eventSpeaker,
  eventTag,
} from '../../db/schema/content';
import { tag } from '../../db/schema/community';
import type { Event } from './types';

type EventRow = typeof event.$inferSelect;

const toIso = (value: Date | null): string => (value ? value.toISOString() : '');

const undefinedIfEmpty = (value: string | null): string | undefined => value ?? undefined;

/**
 * Maps a database row (plus its children) onto the same domain shape the sheet
 * backend produces, so pages cannot tell the two apart.
 */
const toEvent = (
  row: EventRow,
  children: {
    images: string[];
    speakers: Event['speakers'];
    agenda: Event['agenda'];
    tags: string[];
  },
): Event => ({
  title: row.title,
  slug: row.slug,
  startDate: toIso(row.startDate),
  endDate: toIso(row.endDate),
  link: row.link ?? '',
  location: undefinedIfEmpty(row.location),
  type: row.type,
  attendanceMode: row.attendanceMode ?? undefined,
  description: undefinedIfEmpty(row.description),
  long_description: undefinedIfEmpty(row.longDescription),
  venue_name: undefinedIfEmpty(row.venueName),
  venue_map: undefinedIfEmpty(row.venueMap),
  images: children.images,
  speakers: children.speakers,
  agenda: children.agenda,
  community: undefinedIfEmpty(row.community),
  cfpStatus: row.cfpStatus === 'none' ? undefined : row.cfpStatus,
  cfpEndDate: row.cfpEndDate ? row.cfpEndDate.toISOString() : undefined,
  tags: children.tags,
  venue: undefinedIfEmpty(row.venue),
  featured: row.featured,
});

const loadChildren = async (db: Database, eventIds: string[]) => {
  if (eventIds.length === 0) {
    return { images: new Map(), speakers: new Map(), agenda: new Map(), tags: new Map() } as const;
  }

  // Four batched queries rather than N+1 per event.
  const [images, speakers, agenda, tags] = await Promise.all([
    db
      .select()
      .from(eventImage)
      .where(inArray(eventImage.eventId, eventIds))
      .orderBy(asc(eventImage.position)),
    db
      .select()
      .from(eventSpeaker)
      .where(inArray(eventSpeaker.eventId, eventIds))
      .orderBy(asc(eventSpeaker.position)),
    db
      .select()
      .from(eventAgendaItem)
      .where(inArray(eventAgendaItem.eventId, eventIds))
      .orderBy(asc(eventAgendaItem.position)),
    db
      .select({ eventId: eventTag.eventId, name: tag.name })
      .from(eventTag)
      .innerJoin(tag, eq(tag.id, eventTag.tagId))
      .where(inArray(eventTag.eventId, eventIds)),
  ]);

  const groupBy = <T extends { eventId: string }, R>(
    rows: T[],
    project: (row: T) => R,
  ): Map<string, R[]> => {
    const grouped = new Map<string, R[]>();
    for (const row of rows) {
      const list = grouped.get(row.eventId) ?? [];
      list.push(project(row));
      grouped.set(row.eventId, list);
    }
    return grouped;
  };

  return {
    images: groupBy(images, (row) => row.url),
    speakers: groupBy(speakers, (row) => ({
      name: row.name,
      role: row.role ?? '',
      avatar: row.avatar ?? undefined,
      company: row.company ?? undefined,
    })),
    agenda: groupBy(agenda, (row) => ({ time: row.time, activity: row.activity })),
    tags: groupBy(tags, (row) => row.name),
  } as const;
};

const hydrate = async (db: Database, rows: EventRow[]): Promise<Event[]> => {
  const children = await loadChildren(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) =>
    toEvent(row, {
      images: children.images.get(row.id) ?? [],
      speakers: children.speakers.get(row.id) ?? [],
      agenda: children.agenda.get(row.id) ?? [],
      tags: children.tags.get(row.id) ?? [],
    }),
  );
};

export const fetchEventsFromDb = async (db: Database = defaultDb): Promise<Event[]> => {
  // db is passed explicitly by tests and the importer; pages get the singleton.
  const rows = await db
    .select()
    .from(event)
    .where(eq(event.status, 'published'))
    .orderBy(asc(event.startDate));

  return hydrate(db, rows);
};

export const fetchEventFromDb = async (db: Database, slug: string): Promise<Event | undefined> => {
  const rows = await db.select().from(event).where(eq(event.slug, slug)).limit(1);
  const [hydrated] = await hydrate(db, rows);
  return hydrated;
};
