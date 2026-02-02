import Papa from 'papaparse';

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
}

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2mSHZRiGUWzVlnuHWSpNDdUPDSJH94zMwTPcX0ude9nylJ0-GIcd3zlEpgeGKu0eCyEXLw1nXm0HH/pub?gid=0&single=true&output=csv";

export async function getJobs(): Promise<Job[]> {
    try {
        const fetchUrl = new URL(GOOGLE_SHEET_URL);
        fetchUrl.searchParams.set('t', Date.now().toString());

        const response = await fetch(fetchUrl.toString());
        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.statusText}`);
        }

        const csvText = await response.text();
        const { data, errors } = Papa.parse<SheetJob>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        if (errors.length > 0) {
            console.warn('CSV Parse errors:', errors);
        }

        return data
            .filter(row => row.jobSlug && row.title)
            .map(row => ({
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
                postedOn: new Date(row.postedOn),
                description: row.description || ''
            }));
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
    }
}

export async function getJob(slug: string): Promise<Job | undefined> {
    const jobs = await getJobs();
    return jobs.find(job => job.jobSlug === slug);
}
