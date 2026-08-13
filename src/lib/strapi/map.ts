import { readCfpStatus, readTypeColumn } from '../events/parse';
import type { Event } from '../events/types';
import type { Job } from '../jobs/types';

/**
 * Shapes returned by the Strapi REST API for the content types defined in the
 * CMS. Fields are optional because a query that does not `populate` a relation
 * simply omits it, and the site must render either way.
 */

export interface StrapiTag {
  id: number;
  name: string;
  slug?: string;
}

export interface StrapiSpeaker {
  id: number;
  name: string;
  role?: string | null;
  company?: string | null;
  link?: string | null;
}

export interface StrapiAgendaItem {
  id: number;
  time?: string | null;
  activity?: string | null;
}

export interface StrapiCompany {
  id: number;
  name: string;
  slug?: string;
  website?: string | null;
  about?: string | null;
}

export interface StrapiEvent {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  start_date: string;
  end_date?: string | null;
  link?: string | null;
  location?: string | null;
  event_type?: string | null;
  description?: string | null;
  long_description?: string | null;
  community?: string | null;
  venue?: string | null;
  venue_name?: string | null;
  venue_map?: string | null;
  cfp_status?: string | null;
  cfp_end_date?: string | null;
  featured?: boolean | null;
  submitted_by?: string | null;
  speakers?: StrapiSpeaker[];
  agenda?: StrapiAgendaItem[];
  event_tags?: StrapiTag[];
  images?: { id: number; url: string }[];
}

export interface StrapiJob {
  id: number;
  documentId: string;
  title: string;
  job_slug: string;
  apply_link: string;
  posted_on?: string | null;
  experience?: string | null;
  job_type?: string | null;
  job_mode?: string | null;
  location?: string | null;
  description?: string | null;
  job_status?: string | null;
  openings?: number | null;
  featured?: boolean | null;
  submitted_by?: string | null;
  company?: StrapiCompany | null;
  skills?: StrapiTag[];
}

const text = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value === '' ? undefined : value;

export const toEvent = (row: StrapiEvent): Event => {
  // The CMS keeps one `event_type` field, which in practice records how people
  // attend. Split it the same way the sheet reader does so both sources agree.
  const { type, attendanceMode } = readTypeColumn(row.event_type ?? undefined);

  return {
    title: row.title,
    slug: row.slug,
    startDate: row.start_date,
    endDate: row.end_date ?? '',
    link: row.link ?? '',
    location: text(row.location),
    type,
    attendanceMode,
    description: text(row.description),
    long_description: text(row.long_description),
    venue_name: text(row.venue_name),
    venue_map: text(row.venue_map),
    images: (row.images ?? []).map((image) => image.url),
    speakers: (row.speakers ?? []).map((speaker) => ({
      name: speaker.name,
      role: speaker.role ?? '',
      company: speaker.company ?? undefined,
      avatar: speaker.link ?? undefined,
    })),
    agenda: (row.agenda ?? []).map((item) => ({
      time: item.time ?? '',
      activity: item.activity ?? '',
    })),
    community: text(row.community),
    cfpStatus: readCfpStatus(row.cfp_status ?? undefined),
    cfpEndDate: text(row.cfp_end_date),
    tags: (row.event_tags ?? []).map((tag) => tag.name),
    venue: text(row.venue),
    featured: row.featured ?? false,
  };
};

export const toJob = (row: StrapiJob): Job => ({
  title: row.title,
  company: row.company?.name ?? '',
  jobSlug: row.job_slug,
  featured: row.featured ?? false,
  skills: (row.skills ?? []).map((skill) => skill.name),
  experience: row.experience ?? '',
  jobType: row.job_type ?? '',
  jobMode: row.job_mode ?? '',
  location: row.location ?? '',
  companyWebsite: row.company?.website ?? '',
  applyLink: row.apply_link,
  postedOn: row.posted_on ? new Date(row.posted_on) : new Date(),
  description: row.description ?? '',
  aboutCompany: row.company?.about ?? '',
  status: (row.job_status ?? '').trim().toLowerCase() === 'closed' ? 'Closed' : 'Open',
  openings: row.openings === null || row.openings === undefined ? '1' : String(row.openings),
});
