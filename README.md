# Open Source Weekend Community Platform

A comprehensive community platform built for **Open Source Weekend**, featuring upcoming events, past meetups, and a dynamic job board. Powered by **Astro**, **Tailwind CSS**, and **Google Sheets** as the CMS.

## 🚀 Features

-   **Community Hub**: central landing page (`/`) showcasing the community mission, upcoming events, and job opportunities.
-   **Events System**:
    -   Lists **Upcoming** and **Past** events automatically based on dates.
    -   Dynamic data fetching from Google Sheets.
-   **Job Board**:
    -   Real-time job listings fetched from Google Sheets.
    -   **Status Indicators**: "Open" or "Closed" status with visual warnings for closed roles.
    -   **Openings Count**: Displays the number of available positions.
-   **Server-Side Rendering (SSR)**: Dynamic content with excellent SEO and performance.
-   **Design System**: Premium, dark-mode ready UI built with Tailwind CSS v4 and `lucide-astro` icons.

## 🛠️ Tech Stack

-   **Framework**: [Astro](https://astro.build/) (SSR mode)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Deployment**: [Vercel](https://vercel.com/) (Serverless Functions)
-   **Data Source**: Google Sheets (via CSV export) for both Jobs and Events.

## ⚡ Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Job_Portal
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your Google Sheet CSV URLs:

```bash
# Jobs Data Source
GOOGLE_JOBS_SHEET_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv

# Events Data Source
GOOGLE_EVENTS_SHEET_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv
```

> **Note**: Your Google Sheets must be "Published to the Web" as a CSV.

### 3. Run Locally

```bash
npm run dev
```

Visit `http://localhost:4321` to see the app.

## 📂 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/             # Reusable design system (Badge, Button, etc.)
│   │   ├── EventCard.astro # Event display component
│   │   └── JobCard.astro   # Job display component
│   ├── lib/
│   │   ├── events.ts       # Events fetching & caching logic
│   │   └── jobs.ts         # Jobs fetching & caching logic
│   ├── pages/
│   │   ├── index.astro     # Landing Page
│   │   ├── events/         # Events Page
│   │   └── jobs/           # Job Board & Detail Pages
│   └── layouts/            # Main Layout (Header, Footer)
└── astro.config.mjs        # SSR configuration (Vercel adapter)
```

## 📊 Data Management (Google Sheets)

### Jobs Sheet Headers
- `title`, `company`, `jobSlug`, `featured` (TRUE/FALSE)
- `location`, `jobType` (Remote/Onsite), `jobMode` (Full-time/Contract)
- `status` (Open/Closed), `openings` (Number)
- `postedOn` (Date), `applyLink`, `description`, `About Company`

### Events Sheet Headers
- `title`, `startDate` (ISO/Date), `endDate` (ISO/Date)
- `link` (Registration URL), `location`, `type` (Meetup/Workshop)
- `description`

## 🚀 Deployment

The project is configured for **Vercel**.

1.  Push your code to GitHub/GitLab.
2.  Import the project in Vercel.
3.  **Crucial**: Add the `GOOGLE_JOBS_SHEET_URL` and `GOOGLE_EVENTS_SHEET_URL` environment variables in Vercel Project Settings.
4.  Deploy!
