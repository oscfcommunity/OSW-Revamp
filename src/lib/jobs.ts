import Papa from 'papaparse';

// --- Interfaces ---

export interface Job {
    title: string;
    company: string;
    jobSlug: string;
    featured: boolean;
    skills: string[];
    experience: string;
    jobType: string;
    jobMode: string;
    location: string;
    companyWebsite: string;
    applyLink: string;
    postedOn: Date;
    description: string;
    aboutCompany: string;
    status: 'Open' | 'Closed';
    openings: string;
}

interface SheetJob {
    title: string;
    company: string;
    jobSlug: string;
    featured: string;
    skills: string;
    experience: string;
    jobType: string;
    jobMode: string;
    location: string;
    companyWebsite: string;
    applyLink: string;
    postedOn: string;
    description: string;
    "About Company": string;
    "Job Description": string;
    status: string;
    openings: string;
}

// --- Constants & Configuration ---

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// --- State (Singleton Cache) ---

interface JobCache {
    data: Job[];
    lastFetched: number;
}

let cache: JobCache | null = null;

// --- Private Helpers ---

async function getSheetUrl(): Promise<string> {
    const url = import.meta.env.GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('GOOGLE_SHEET_URL environment variable is not set');
    }
    return url;
}

/**
 * Fetches raw CSV text from the Google Sheet.
 * Adds a timestamp to bypass Google's internal caching if needed, 
 * though our local cache will prevent frequent calls.
 */
async function fetchRawCSV(): Promise<string> {
    const url = await getSheetUrl();
    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('t', Date.now().toString());

    const response = await fetch(fetchUrl.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    return await response.text();
}

/**
 * Parses CSV text into typed objects using PapaParse.
 */
function parseCSV(csvText: string): SheetJob[] {
    const { data, errors } = Papa.parse<SheetJob>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim() // Handle potential trailing spaces/newlines
    });

    if (errors.length > 0) {
        console.warn('CSV Parse errors:', errors);
    }

    return data;
}

/**
 * Safely parses a date string into a Date object.
 * Returns current date if parsing fails.
 */
function parseDate(dateString: string): Date {
    if (!dateString || dateString.trim() === '') {
        return new Date();
    }

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: "${dateString}". Using current date.`);
        return new Date();
    }

    return date;
}

/**
 * Maps a raw CSV row to our clean Job domain object.
 */
function mapRowToJob(row: SheetJob): Job | null {
    // Basic validation
    if (!row.jobSlug || !row.title) {
        return null;
    }

    return {
        title: row.title,
        company: row.company,
        jobSlug: row.jobSlug,
        featured: row.featured?.toUpperCase() === 'TRUE',
        skills: row.skills ? row.skills.split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
        experience: row.experience,
        jobType: row.jobType,
        jobMode: row.jobMode,
        location: row.location,
        companyWebsite: row.companyWebsite,
        applyLink: row.applyLink,
        postedOn: parseDate(row.postedOn),
        // Prioritize 'Job Description' col, fallback to 'description', then empty
        description: row["Job Description"] || row.description || '',
        aboutCompany: row["About Company"] || '',
        status: row.status?.trim() === 'Closed' ? 'Closed' : 'Open',
        openings: row.openings || '1'
    };
}

// --- Public API ---

/**
 * Returns the list of jobs.
 * Uses in-memory caching to reduce latency and API calls.
 */
export async function getJobs(): Promise<Job[]> {
    const now = Date.now();

    // Return cached data if valid
    if (cache && (now - cache.lastFetched < CACHE_TTL_MS)) {
        return cache.data;
    }

    try {
        const csvText = await fetchRawCSV();
        const rawRows = parseCSV(csvText);

        const jobs = rawRows
            .map(mapRowToJob)
            .filter((job): job is Job => job !== null);

        // Update cache
        cache = {
            data: jobs,
            lastFetched: now
        };

        return jobs;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        // Fallback to cache even if stale, if available
        if (cache) {
            console.warn('Serving stale cache due to fetch error');
            return cache.data;
        }
        return [];
    }
}

/**
 * Helper to get a single job by slug.
 */
export async function getJob(slug: string): Promise<Job | undefined> {
    const jobs = await getJobs();
    return jobs.find(job => job.jobSlug === slug);
}
