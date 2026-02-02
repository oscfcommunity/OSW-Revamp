# TechJobs Portal

A modern, server-side rendered (SSR) job board built with **Astro**, **Tailwind CSS**, and **Google Sheets** as the CMS.

## 🚀 Features

-   **Real-time Updates**: Jobs are fetched directly from a Google Sheet on every request.
-   **Server-Side Rendering (SSR)**: Dynamic content with excellent SEO and performance.
-   **Design System**: Built with a custom, reusable component library (Badges, Buttons, etc.) and Tailwind CSS.
-   **Performance**: In-memory server-side caching (60s TTL) to minimize latency while ensuring data freshness.
-   **Search Optimized**: Semantic HTML and fast load times.

## 🛠️ Tech Stack

-   **Framework**: [Astro](https://astro.build/) (SSR mode)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Deployment**: [Vercel](https://vercel.com/) (Serverless Functions)
-   **Data Source**: Google Sheets (via CSV export)
-   **Icons**: [Lucide Astro](https://lucide.dev/)

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

Create a `.env` file in the root directory:

```bash
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?gid=0&single=true&output=csv
```

> **Note**: Your Google Sheet must be "Published to the Web" as a CSV.

### 3. Run Locally

```bash
npm run dev
```

Visit `http://localhost:4321` to see the app.

## 📂 Project Structure

```
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable design system (Badge, Button, etc.)
│   │   └── JobCard.astro
│   ├── layouts/
│   ├── lib/
│   │   └── jobs.ts      # Data fetching, caching, and parsing logic
│   ├── pages/
│   │   ├── index.astro  # Homepage (Job Feed)
│   │   └── jobs/
│   │       └── [slug].astro # Job Detail Page
└── astro.config.mjs     # SSR configuration (Vercel adapter)
```

## 🚀 Deployment

The project is configured for **Vercel**.

1.  Push your code to GitHub/GitLab.
2.  Import the project in Vercel.
3.  **Crucial**: Add the `GOOGLE_SHEET_URL` environment variable in Vercel Project Settings.
4.  Deploy!
