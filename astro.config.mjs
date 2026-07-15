// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// https://astro.build/config
export default defineConfig({
  site: 'https://opensourceweekend.org',

  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.GOOGLE_EVENTS_SHEET_URL': JSON.stringify('https://docs.google.com/spreadsheets/d/e/2PACX-1vTXFbB89XRgjCZJBwPH7KleO9qKoxzzqt30F9a8FDrOzyqxzaPmCq4axRP73x2Dz5luedeQV4jrCicB/pub?gid=0&single=true&output=csv'),
      'import.meta.env.GOOGLE_JOBS_SHEET_URL': JSON.stringify('https://docs.google.com/spreadsheets/d/e/2PACX-1vTsuOqK_wQ8Z6S6zcCfATuHx8pChd-nZeCTnn6KY8VeJDosgNnAizLwDOogbqK6kn_CS--H17DdICJG/pub?gid=0&single=true&output=csv')
    }
  },

  integrations: [sitemap()],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});

