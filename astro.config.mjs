// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://opensourceweekend.org',

  vite: {
    // @ts-expect-error Astro 6 ships rolldown-vite; @tailwindcss/vite is still typed
    // against rollup's PluginContextMeta. Runtime is unaffected.
    plugins: [tailwindcss()],
  },

  env: {
    schema: {
      // Content sources (the sheets are retired once CONTENT_SOURCE flips to 'strapi')
      GOOGLE_EVENTS_SHEET_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GOOGLE_JOBS_SHEET_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // `secret` rather than `public` so it is read from process.env at runtime
      // instead of being inlined at build time: one image can then serve any
      // environment, and tests can pin the backend they mean to exercise.
      CONTENT_SOURCE: envField.enum({
        context: 'server',
        access: 'secret',
        values: ['sheet', 'strapi'],
        default: 'sheet',
      }),

      // Strapi CMS — the source of truth for events and jobs
      STRAPI_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      STRAPI_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Database
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Auth
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      BETTER_AUTH_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'http://localhost:4321',
      }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      /** Comma separated emails promoted to admin on sign in. Bootstraps the first admin. */
      ADMIN_EMAILS: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Email
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      EMAIL_FROM: envField.string({
        context: 'server',
        access: 'public',
        default: 'noreply@opensourceweekend.org',
      }),
      ADMIN_NOTIFY_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'opensourceweekend@gmail.com',
      }),
    },
  },

  security: {
    // Astro only trusts Host and X-Forwarded-* headers for domains listed here.
    // Without this it falls back to http://localhost:<port>, so every form POST
    // from the real site looks cross-origin and is rejected by the CSRF check —
    // which is what broke sign out in production. Declaring the domain is the
    // fix; turning off checkOrigin would remove the protection instead.
    allowedDomains: [
      { hostname: 'opensourceweekend.org', protocol: 'https' },
      { hostname: 'www.opensourceweekend.org', protocol: 'https' },
    ],
  },

  integrations: [sitemap()],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
