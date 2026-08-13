import Papa from 'papaparse';

import {
  ATTENDANCE_MODES,
  EVENT_TYPES,
  type AgendaItem,
  type AttendanceMode,
  type Event,
  type EventType,
  type Speaker,
} from './types';

/**
 * Pure parsing of the events CSV. Kept free of `astro:env` and of any network
 * access so that plain Node scripts (the Strapi importer) can reuse exactly the
 * parsing the site has been running on.
 */

export interface SheetEvent {
  title: string;
  slug?: string;
  startDate: string;
  endDate: string;
  link: string;
  location: string;
  type: string;
  description: string;

  long_description?: string;
  venue_name?: string;
  venue_map?: string;
  images?: string; // Comma separated URLs
  speaker_data?: string; // "Name:Role:Avatar | Name:Role:Avatar"
  agenda?: string; // "10:00:Intro ; 11:00:Talk"

  community?: string;
  cfpStatus?: string;
  cfpEndDate?: string;
  tags?: string; // Comma separated
  venue?: string;
  featured?: string; // "TRUE" or "FALSE"
}

export function parseCSV(csvText: string): SheetEvent[] {
  const { data, errors } = Papa.parse<SheetEvent>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (errors.length > 0) {
    console.warn('CSV Parse errors:', errors);
  }

  return data;
}

export function parseSpeakers(data?: string): Speaker[] {
  if (!data) return [];
  return data.split('|').map((s) => {
    // Expected format: Name:Role:Avatar — the avatar is a URL and contains
    // colons of its own, so only the first two separators are structural.
    const [name = '', role = '', ...avatarParts] = s.split(':');
    return {
      name: name.trim() || 'Unknown',
      role: role.trim(),
      avatar: avatarParts.join(':').trim() || undefined,
    };
  });
}

export function parseAgenda(data?: string): AgendaItem[] {
  if (!data) return [];
  return data.split(';').map((s) => {
    // A clock time carries a colon of its own ("10:00"), so match it first and
    // only fall back to the first separator for free-form labels ("Evening").
    const clockTime = /^\s*(\d{1,2}:\d{2}\s*(?:[AaPp][Mm])?)\s*:\s*(.*)$/.exec(s);
    if (clockTime) {
      return { time: clockTime[1]!.trim(), activity: clockTime[2]!.trim() };
    }
    const separator = s.indexOf(':');
    if (separator === -1) {
      return { time: '', activity: s.trim() };
    }
    return {
      time: s.slice(0, separator).trim(),
      activity: s.slice(separator + 1).trim(),
    };
  });
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const isEventType = (value: string): value is EventType =>
  (EVENT_TYPES as readonly string[]).includes(value);

const isAttendanceMode = (value: string): value is AttendanceMode =>
  (ATTENDANCE_MODES as readonly string[]).includes(value);

/**
 * The sheet's "type" column mixes two ideas: most rows record how people attend
 * ("In-person", "Online", "Hybrid"), a few record what kind of event it is.
 */
export const readTypeColumn = (
  value: string | undefined,
): { type: EventType; attendanceMode?: AttendanceMode } => {
  const trimmed = value?.trim() ?? '';
  if (isAttendanceMode(trimmed)) {
    return { type: 'Meetup', attendanceMode: trimmed };
  }
  if (isEventType(trimmed)) {
    return { type: trimmed };
  }
  return { type: 'Meetup' };
};

/** The sheet writes "NA" where there is no call for papers. */
export const readCfpStatus = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NA') {
    return undefined;
  }
  return trimmed;
};

export function mapRowToEvent(row: SheetEvent): Event | null {
  if (!row.title || !row.startDate) {
    return null;
  }

  const slug =
    row.slug && row.slug.trim() !== ''
      ? row.slug
      : slugify(`${row.title}-${new Date(row.startDate).getFullYear()}`);

  const { type, attendanceMode } = readTypeColumn(row.type);

  return {
    title: row.title,
    slug,
    startDate: row.startDate,
    endDate: row.endDate,
    link: row.link,
    location: row.location || undefined,
    type,
    attendanceMode,
    description: row.description || undefined,
    long_description: row.long_description || undefined,
    venue_name: row.venue_name || undefined,
    venue_map: row.venue_map || undefined,
    images: row.images
      ? row.images
          .split(',')
          .map((i) => i.trim())
          .filter((i) => i.length > 0)
      : [],
    speakers: parseSpeakers(row.speaker_data),
    agenda: parseAgenda(row.agenda),

    community: row.community || undefined,
    cfpStatus: readCfpStatus(row.cfpStatus),
    cfpEndDate: row.cfpEndDate || undefined,
    tags: row.tags
      ? row.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [],
    venue: row.venue || undefined,
    featured: row.featured ? row.featured.toString().toUpperCase() === 'TRUE' : false,
  };
}

/** Parses a full events CSV into domain objects, dropping rows that cannot be used. */
export const parseEventsCsv = (csvText: string): Event[] =>
  parseCSV(csvText)
    .map(mapRowToEvent)
    .filter((event): event is Event => event !== null);
