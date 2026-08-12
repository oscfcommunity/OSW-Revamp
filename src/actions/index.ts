import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';

import { db } from '../db';
import { auditLog, event, job } from '../db/schema/content';
import { fetchEventsFromSheet } from '../lib/events/sheet';
import { fetchJobsFromSheet } from '../lib/jobs/sheet';
import { importEvents, importJobs } from '../lib/import/sheets';
import { AuthorizationError, requireRole, type Viewer } from '../lib/guards';
import { forum } from './forum';

const asActionError = (error: unknown): never => {
  if (error instanceof AuthorizationError) {
    throw new ActionError({
      code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: error.message,
    });
  }
  throw error;
};

/** Middleware decides routing; this is the check that actually protects a mutation. */
const admin = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'admin');
  } catch (error) {
    return asActionError(error);
  }
};

const moderator = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'moderator');
  } catch (error) {
    return asActionError(error);
  }
};

const record = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  after?: unknown,
): Promise<void> => {
  await db.insert(auditLog).values({
    actorId,
    action,
    entityType,
    entityId,
    after: after === undefined ? null : (after as Record<string, unknown>),
  });
};

/**
 * A form always posts strings, and Astro represents an absent field as null.
 * These helpers normalise both to undefined before validation, so an untouched
 * optional input is not reported as a type error.
 */
const emptyToUndefined = (value: unknown): unknown =>
  value === null || value === '' ? undefined : value;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional());

const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());

// `const` on the type parameter keeps the literal union, so the action's output
// type still matches the database enum instead of widening to string.
const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional());

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? new Date(value) : null))
    .refine((value) => value === null || !Number.isNaN(value.getTime()), 'Not a valid date'),
);

const eventInput = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  title: z.string().trim().min(3).max(200),
  startDate: z.string().trim().min(1),
  endDate: optionalText,
  link: optionalUrl,
  location: optionalText,
  venue: optionalText,
  venueName: optionalText,
  venueMap: optionalUrl,
  type: z.enum(['Meetup', 'Workshop', 'Conference', 'Hackathon']).default('Meetup'),
  attendanceMode: optionalEnum(['In-person', 'Hybrid', 'Online']),
  description: optionalText,
  longDescription: z.preprocess(emptyToUndefined, z.string().trim().max(50_000).optional()),
  community: optionalText,
  cfpStatus: z.enum(['none', 'Open', 'Closed']).default('none'),
  cfpEndDate: optionalDate,
  featured: z.coerce.boolean().default(false),
  status: z.enum(['draft', 'published', 'cancelled']).default('published'),
});

const jobInput = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  title: z.string().trim().min(3).max(200),
  company: z.string().trim().min(1),
  companyWebsite: optionalUrl,
  applyLink: z.url(),
  experience: optionalText,
  jobType: optionalText,
  jobMode: optionalText,
  location: optionalText,
  openings: z.preprocess((v) => (v === null || v === '' ? '1' : v), z.string().trim()),
  descriptionMd: z.preprocess((v) => (v === null ? '' : v), z.string().max(50_000)),
  aboutCompany: z.preprocess(emptyToUndefined, z.string().trim().max(50_000).optional()),
  featured: z.coerce.boolean().default(false),
  status: z.enum(['open', 'closed']).default('open'),
});

const blank = (value: string | undefined): string | null => (value?.trim() ? value.trim() : null);

export const server = {
  forum,

  admin: {
    saveEvent: defineAction({
      accept: 'form',
      input: eventInput,
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);

        const startDate = new Date(input.startDate);
        if (Number.isNaN(startDate.getTime())) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'Start date is not a valid date.',
          });
        }
        const endDate = input.endDate ? new Date(input.endDate) : null;

        const values = {
          slug: input.slug,
          title: input.title,
          startDate,
          endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
          link: blank(input.link),
          location: blank(input.location),
          venue: blank(input.venue),
          venueName: blank(input.venueName),
          venueMap: blank(input.venueMap),
          type: input.type,
          attendanceMode: input.attendanceMode ? input.attendanceMode : null,
          description: blank(input.description),
          longDescription: blank(input.longDescription),
          community: blank(input.community),
          cfpStatus: input.cfpStatus,
          cfpEndDate: input.cfpEndDate,
          featured: input.featured,
          status: input.status,
          updatedAt: new Date(),
        };

        const [row] = input.id
          ? await db
              .update(event)
              .set(values)
              .where(eq(event.id, input.id))
              .returning({ id: event.id })
          : await db
              .insert(event)
              .values({ ...values, createdBy: actor.id })
              .returning({ id: event.id });

        if (!row) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Event not found.' });
        }

        await record(actor.id, input.id ? 'event.update' : 'event.create', 'event', row.id, values);
        return { id: row.id, slug: input.slug };
      },
    }),

    deleteEvent: defineAction({
      accept: 'form',
      input: z.object({ id: z.uuid() }),
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);
        await db.delete(event).where(eq(event.id, input.id));
        await record(actor.id, 'event.delete', 'event', input.id);
        return { deleted: true };
      },
    }),

    saveJob: defineAction({
      accept: 'form',
      input: jobInput,
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);

        const values = {
          slug: input.slug,
          title: input.title,
          company: input.company,
          companyWebsite: blank(input.companyWebsite),
          applyLink: input.applyLink,
          experience: blank(input.experience),
          jobType: blank(input.jobType),
          jobMode: blank(input.jobMode),
          location: blank(input.location),
          openings: input.openings || '1',
          descriptionMd: input.descriptionMd,
          aboutCompany: blank(input.aboutCompany),
          featured: input.featured,
          status: input.status,
          updatedAt: new Date(),
        };

        const [row] = input.id
          ? await db.update(job).set(values).where(eq(job.id, input.id)).returning({ id: job.id })
          : await db
              .insert(job)
              .values({ ...values, postedBy: actor.id })
              .returning({ id: job.id });

        if (!row) {
          throw new ActionError({ code: 'NOT_FOUND', message: 'Job not found.' });
        }

        await record(actor.id, input.id ? 'job.update' : 'job.create', 'job', row.id, values);
        return { id: row.id, slug: input.slug };
      },
    }),

    deleteJob: defineAction({
      accept: 'form',
      input: z.object({ id: z.uuid() }),
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);
        await db.delete(job).where(eq(job.id, input.id));
        await record(actor.id, 'job.delete', 'job', input.id);
        return { deleted: true };
      },
    }),

    importFromSheets: defineAction({
      accept: 'form',
      input: z.object({ dryRun: z.coerce.boolean().default(false) }),
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);

        const [events, jobs] = await Promise.all([
          fetchEventsFromSheet().catch(() => []),
          fetchJobsFromSheet().catch(() => []),
        ]);

        const eventReport = await importEvents(db, events, { dryRun: input.dryRun });
        const jobReport = await importJobs(db, jobs, { dryRun: input.dryRun });

        if (!input.dryRun) {
          await record(actor.id, 'content.import', 'sheets', 'google-sheets', {
            eventReport,
            jobReport,
          });
        }

        return { dryRun: input.dryRun, events: eventReport, jobs: jobReport };
      },
    }),
  },

  moderation: {
    setUserRole: defineAction({
      accept: 'form',
      input: z.object({
        userId: z.string().min(1),
        role: z.enum(['user', 'moderator', 'admin']),
      }),
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);
        const { user } = await import('../db/schema/auth');

        if (input.userId === actor.id) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'You cannot change your own role.',
          });
        }

        await db
          .update(user)
          .set({ role: input.role, updatedAt: new Date() })
          .where(eq(user.id, input.userId));
        await record(actor.id, 'user.role', 'user', input.userId, { role: input.role });
        return { role: input.role };
      },
    }),

    banUser: defineAction({
      accept: 'form',
      input: z.object({
        userId: z.string().min(1),
        days: z.coerce.number().int().min(0).max(3650),
        reason: z.string().trim().max(500).optional(),
      }),
      handler: async (input, context) => {
        const actor = moderator(context.locals.viewer);
        const { user } = await import('../db/schema/auth');

        const bannedUntil =
          input.days > 0 ? new Date(Date.now() + input.days * 24 * 60 * 60 * 1000) : null;

        await db
          .update(user)
          .set({ bannedUntil, banReason: input.reason ?? null, updatedAt: new Date() })
          .where(eq(user.id, input.userId));
        await record(actor.id, bannedUntil ? 'user.ban' : 'user.unban', 'user', input.userId, {
          bannedUntil,
        });
        return { bannedUntil };
      },
    }),
  },
};
