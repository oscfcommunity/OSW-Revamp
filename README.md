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

```bash
# No environment variables required for standard setup
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

### 📄 Google Sheet Schemas

To correctly fetch data, your Google Sheets must use the **exact** headers below. Copy and paste these into the first row of your spreadsheets.

#### 1. Events Sheet
```csv
title,startDate,endDate,link,location,type,description
```

#### 2. Jobs Sheet
```csv
title,company,jobSlug,featured,skills,experience,jobType,jobMode,location,companyWebsite,applyLink,postedOn,About Company,Job Description,Status,openings
```

## 🚀 Deployment

The project is configured for **Vercel**.

1.  Push your code to GitHub/GitLab.
2.  Import the project in Vercel.
3.  **Deploy!** (Environment variables for Sheet URLs are now hardcoded in `astro.config.mjs`)
