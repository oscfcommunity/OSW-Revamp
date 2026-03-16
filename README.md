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

## 🧩 CI/CD — Automatic deploy to your VPS (GitHub Actions)

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that runs on every push to `main`. It does the following:

- Checks out the repo
- Copies the repository to your VPS via SCP
- SSHes to the VPS and builds the Docker image there, then restarts the container

Required GitHub Secrets

- `VPS_HOST` — your VPS IP or hostname
- `VPS_USER` — SSH user on the VPS (e.g., `root` or `deploy`)
- `VPS_PRIVATE_KEY` — the private SSH key (PEM format) that matches a public key in `~/.ssh/authorized_keys` for `VPS_USER`
- `VPS_PORT` — optional SSH port (defaults to `22`)
- `VPS_TARGET_DIR` — path on the VPS where the repo will be copied and built (e.g., `/home/deploy/osw`)
- `DOCKER_IMAGE_NAME` — optional image name (default: `osw-frontend:latest`)

Notes and security

- Add only the private key to GitHub Secrets, never commit keys to the repo.
- Ensure the `VPS_USER` has permission to run Docker or use `sudo` from that account.
- The workflow builds the Docker image on the VPS. This avoids pushing images to a registry.

Quick checklist to enable deploys

1. On your VPS, create a deploy user and give it Docker access, or use `root`.
2. Add the public key to `/home/<user>/.ssh/authorized_keys`.
3. Add the private key and other secrets to your GitHub repository's Secrets.
4. Push a commit to the `trunk` branch — the workflow will run automatically.

If you'd prefer pushing images to a registry (Docker Hub / GitHub Container Registry) and pulling them from the VPS instead, I can update the workflow to build & push the image from Actions and perform a `docker pull` on the VPS.
