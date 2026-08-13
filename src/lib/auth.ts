import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from 'astro:env/server';

import { db, schema } from '../db';

const hasGoogle = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const hasGitHub = Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);

/** Which providers the login page should offer. */
export const availableProviders = {
  google: hasGoogle,
  github: hasGitHub,
} as const;

/**
 * Email + password exists so the site is usable locally before OAuth clients are
 * registered. It is off in production, where Google and GitHub are the only ways in.
 */
export const emailPasswordEnabled = import.meta.env.DEV;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: false }),
  secret: BETTER_AUTH_SECRET ?? 'dev-only-insecure-secret-change-me',
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: ['https://opensourceweekend.org', 'http://localhost:4321'],

  emailAndPassword: {
    enabled: emailPasswordEnabled,
    requireEmailVerification: false,
  },

  socialProviders: {
    ...(hasGoogle
      ? { google: { clientId: GOOGLE_CLIENT_ID!, clientSecret: GOOGLE_CLIENT_SECRET! } }
      : {}),
    ...(hasGitHub
      ? {
          github: {
            clientId: GITHUB_CLIENT_ID!,
            clientSecret: GITHUB_CLIENT_SECRET!,
            // Needed to read a verified primary email; GitHub hides it otherwise,
            // and an unverified email must never be auto-linked to an account.
            scope: ['user:email'],
          },
        }
      : {}),
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },

  user: {
    additionalFields: {
      // input: false is load-bearing. Without it a crafted signup payload could
      // set its own role or reputation.
      role: { type: 'string', defaultValue: 'user', input: false },
      reputation: { type: 'number', defaultValue: 0, input: false },
      username: { type: 'string', required: false, input: false },
      bannedUntil: { type: 'date', required: false, input: false },
      banReason: { type: 'string', required: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    useSecureCookies: import.meta.env.PROD,
    defaultCookieAttributes: {
      sameSite: 'lax',
      httpOnly: true,
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
});

export type Auth = typeof auth;
export type SessionUser = typeof auth.$Infer.Session.user;
export type SessionData = typeof auth.$Infer.Session.session;
