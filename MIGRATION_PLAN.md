# Migration Plan: Open Source Weekend Community Platform

## Objective
Transform the current single-page "Job Portal" into a full-featured "Community Website" akin to [opensourceweekend.org](https://opensourceweekend.org), preserving the new premium design system.

## 1. Architecture Restructuring for `src/pages`
| Current Path | New Path | Description |
| :--- | :--- | :--- |
| `/` (Job Feed) | `/jobs` | The current homepage moves to a dedicated jobs section. |
| *New* | `/` | A new Landing Page featuring Hero, Event Previews, and Job Previews. |
| *New* | `/events` | A dedicated page for Upcoming and Past Events. |

## 2. Data Strategy
- **Jobs**: Continue using Google Sheets (cached).
- **Events**: 
  - *Initial*: Static data extracted from the existing website (stored in `src/data/events.ts`).
  - *Future*: Migrate to Google Sheets (similar to Jobs).

## 3. New Components
- **`EventCard.astro`**: A reusable card component for displaying event details (Date, Title, Link), styled consistently with `JobCard`.
- **`Hero.astro`**: High-impact landing page section.

## 4. Execution Roadmap

### Phase 1: Restructure (✅ Ready)
- [ ] Move `src/pages/index.astro` to `src/pages/jobs/index.astro`.
- [ ] Update `src/lib/jobs.ts` if any relative paths need adjustment (unlikely).

### Phase 2: Events Feature
- [ ] Create `src/data/events.ts` with scraped data.
- [ ] Create `EventCard.astro`.
- [ ] Build `src/pages/events/index.astro`.

### Phase 3: Landing Page
- [ ] Build `src/pages/index.astro` (New Home).
- [ ] Implement Hero section.
- [ ] Fetch/Display top 3 jobs and events.

### Phase 4: Navigation
- [ ] Update Header to include Links: `Home`, `Events`, `Jobs`.
