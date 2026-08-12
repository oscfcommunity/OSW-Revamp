import Papa from 'papaparse';

import type { Job } from './types';

/**
 * Pure parsing of the jobs CSV — no `astro:env`, no network — so that plain Node
 * scripts (the Strapi importer) reuse the parsing the site already runs on.
 */

export interface SheetJob {
  title: string;
  company: string;
  jobSlug: string;
  featured: string;
  skills: string;
  experience: string;
  jobType: string;
  jobMode: string;
  location: string;
  companyWebsite: string;
  applyLink: string;
  postedOn: string;
  description: string;
  'About Company': string;
  'Job Description': string;
  status?: string;
  Status?: string; // Value from CSV might be here depending on case
  openings: string;
}

export function parseCSV(csvText: string): SheetJob[] {
  const { data, errors } = Papa.parse<SheetJob>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (errors.length > 0) {
    console.warn('CSV Parse errors:', errors);
  }

  return data;
}

export function parseDate(dateString: string): Date {
  if (!dateString || dateString.trim() === '') {
    return new Date();
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    console.warn(`Invalid date format: "${dateString}". Using current date.`);
    return new Date();
  }

  return date;
}

export function mapRowToJob(row: SheetJob): Job | null {
  if (!row.jobSlug || !row.title) {
    return null;
  }

  return {
    title: row.title,
    company: row.company,
    jobSlug: row.jobSlug,
    featured: row.featured?.toUpperCase() === 'TRUE',
    skills: row.skills ? row.skills.split(',').map((s) => s.trim().replace(/^"|"$/g, '')) : [],
    experience: row.experience,
    jobType: row.jobType,
    jobMode: row.jobMode,
    location: row.location,
    companyWebsite: row.companyWebsite,
    applyLink: row.applyLink,
    postedOn: parseDate(row.postedOn),
    description: row['Job Description'] || row.description || '',
    aboutCompany: row['About Company'] || '',
    status: (row.Status || row.status || '').trim().toLowerCase() === 'closed' ? 'Closed' : 'Open',
    openings: row.openings || '1',
  };
}

/** Parses a full jobs CSV into domain objects, dropping rows that cannot be used. */
export const parseJobsCsv = (csvText: string): Job[] =>
  parseCSV(csvText)
    .map(mapRowToJob)
    .filter((job): job is Job => job !== null);
