# Strapi content types for Open Source Weekend

These are the Event, Job, Company, Skill and Event tag content types the website
reads. They live here so they are reviewable and version-controlled alongside the
code that consumes them — the field names in `schema.json` are exactly what
`src/lib/strapi/map.ts` expects, and changing one without the other breaks the
site.

They are **installed into the Strapi project**, not run from here.

## Why they are not already in a CMS

Two Strapi instances run on the server:

| Host                              | Container    | Purpose                                                |
| --------------------------------- | ------------ | ------------------------------------------------------ |
| `cms.opensourceweekend.org`       | `strapi_app` | Open Source Day — Speaker, Sponsor, Team, Ticket       |
| `opensourceweekend.org/admin-cms` | `osw_cms`    | had Event/Job types, but its **admin panel is broken** |

The `osw_cms` admin serves an asset bundle that requests `/admin/*` from the
domain root. It was not built with the `/admin-cms` base path, so nginx routes
those requests to the website and they 404 — the admin panel never loads.

Rather than rebuild that image, these content types go into the working CMS at
`cms.opensourceweekend.org`, so everything is managed from one place.

## Installing

The Strapi project is at `/opt/app/osd_strapi_cms` on the server and is owned by
root, so this needs sudo.

```bash
# From a checkout of this repo, copy the content types across:
sudo cp -r strapi/src/api/*        /opt/app/osd_strapi_cms/src/api/
sudo cp -r strapi/src/components/events /opt/app/osd_strapi_cms/src/components/

# Rebuild and restart that Strapi:
cd /opt/app/osd_strapi_cms
sudo docker compose build
sudo docker compose up -d
```

Strapi applies the schema to its database on boot. Watch it come up with
`docker logs -f strapi_app`; the new types then appear in the admin under
Content Manager.

**This restarts the Open Source Day CMS.** Adding content types does not touch
its existing Speaker/Sponsor/Team/Ticket data, but it is a live service, so take
a database dump first:

```bash
sudo docker exec -t strapi_db pg_dump -U postgres -Fc osd_strapi_db \
  | gzip > ~/osd-strapi-$(date +%F-%H%M).dump.gz
```

## After installing

1. **Settings → API Tokens** in `cms.opensourceweekend.org`: create a read-only
   token for the website and a short-lived full-access token for the one-off
   import.
2. Point the website at this CMS:
   `STRAPI_URL=https://cms.opensourceweekend.org` (or `http://strapi_app:1337`
   from inside the docker network, which skips the round trip through nginx).
3. Run `scripts/import-to-strapi.ts --dry-run`, then for real.
4. Once the entries look right, retire `osw_cms`. Its database is empty, so
   nothing is lost. Keep the `osw_db` container: the website's own tables
   (accounts, sessions, forum) live there in a separate `osw_app` database.

## Notes on the schema

- **Draft & Publish is on**, matching the rest of the CMS. A REST create writes a
  draft, and a read-only token only sees published entries, so the import script
  writes with `?status=published`.
- **`event_type` records how people attend** (In-person / Online / Hybrid), not
  what kind of event it is. That is how the Google Sheet used the column, and the
  site splits it into an attendance mode on read. Do not repurpose it without
  changing `src/lib/strapi/map.ts`.
- **`slug` and `job_slug` are `uid` fields** derived from the title. They are the
  identity the website's URLs and the import script both key on, so they must stay
  unique and stable.
- **`submitted_by` is marked private**, so it is never exposed through the public
  API. It exists for the community submission flow.
