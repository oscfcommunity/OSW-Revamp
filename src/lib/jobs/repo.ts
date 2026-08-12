import { desc, eq, inArray } from 'drizzle-orm';

import { db as defaultDb, type Database } from '../../db';
import { job, jobSkill } from '../../db/schema/content';
import { tag } from '../../db/schema/community';
import type { Job } from './types';

type JobRow = typeof job.$inferSelect;

const toJob = (row: JobRow, skills: string[]): Job => ({
  title: row.title,
  company: row.company,
  jobSlug: row.slug,
  featured: row.featured,
  skills,
  experience: row.experience ?? '',
  jobType: row.jobType ?? '',
  jobMode: row.jobMode ?? '',
  location: row.location ?? '',
  companyWebsite: row.companyWebsite ?? '',
  applyLink: row.applyLink,
  postedOn: row.postedOn,
  description: row.descriptionMd,
  aboutCompany: row.aboutCompany ?? '',
  status: row.status === 'closed' ? 'Closed' : 'Open',
  openings: row.openings,
});

const loadSkills = async (db: Database, jobIds: string[]): Promise<Map<string, string[]>> => {
  const grouped = new Map<string, string[]>();
  if (jobIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({ jobId: jobSkill.jobId, name: tag.name })
    .from(jobSkill)
    .innerJoin(tag, eq(tag.id, jobSkill.tagId))
    .where(inArray(jobSkill.jobId, jobIds));

  for (const row of rows) {
    const list = grouped.get(row.jobId) ?? [];
    list.push(row.name);
    grouped.set(row.jobId, list);
  }
  return grouped;
};

const hydrate = async (db: Database, rows: JobRow[]): Promise<Job[]> => {
  const skills = await loadSkills(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => toJob(row, skills.get(row.id) ?? []));
};

export const fetchJobsFromDb = async (db: Database = defaultDb): Promise<Job[]> => {
  const rows = await db.select().from(job).orderBy(desc(job.postedOn));
  return hydrate(db, rows);
};

export const fetchJobFromDb = async (db: Database, slug: string): Promise<Job | undefined> => {
  const rows = await db.select().from(job).where(eq(job.slug, slug)).limit(1);
  const [hydrated] = await hydrate(db, rows);
  return hydrated;
};
