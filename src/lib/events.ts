import Papa from 'papaparse';

// --- Interfaces ---

export interface Speaker {
    name: string;
    role: string;
    avatar?: string;
    company?: string;
}

export interface AgendaItem {
    time: string;
    activity: string;
}

export interface Event {
    title: string;
    slug: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    link: string;
    location?: string;
    type?: "Meetup" | "Workshop" | "Conference" | "Hackathon";
    description?: string;

    // Detailed Fields
    long_description?: string;
    venue_name?: string;
    venue_map?: string;
    images?: string[];
    speakers?: Speaker[];
    agenda?: AgendaItem[];

    // Redesign Fields
    community?: string;
    cfpStatus?: string;
    cfpEndDate?: string;
    tags?: string[];
    venue?: string;
    featured?: boolean;
}

interface SheetEvent {
    title: string;
    slug?: string;
    startDate: string;
    endDate: string;
    link: string;
    location: string;
    type: string;
    description: string;

    // New Columns per Schema
    long_description?: string;
    venue_name?: string;
    venue_map?: string;
    images?: string;        // Comma separated URLs
    speaker_data?: string;  // "Name:Role:Avatar | Name:Role:Avatar"
    agenda?: string;        // "10:00:Intro ; 11:00:Talk"

    // Redesign Fields (from CSV)
    community?: string;
    cfpStatus?: string;
    cfpEndDate?: string;
    tags?: string;          // Comma separated
    venue?: string;         // e.g. "Looking for venue" | "TBA"
    featured?: string;      // "TRUE" or "FALSE"
}

// --- Configuration ---

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface EventCache {
    data: Event[];
    lastFetched: number;
}

let cache: EventCache | null = null;

// --- Private Helpers ---

async function getSheetUrl(): Promise<string> {
    const url = import.meta.env.GOOGLE_EVENTS_SHEET_URL;
    if (!url) {
        throw new Error('GOOGLE_EVENTS_SHEET_URL environment variable is not set');
    }
    return url;
}

async function fetchRawCSV(): Promise<string> {
    const url = await getSheetUrl();
    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('t', Date.now().toString());

    const response = await fetch(fetchUrl.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch events sheet: ${response.statusText}`);
    }
    return await response.text();
}

function parseCSV(csvText: string): SheetEvent[] {
    const { data, errors } = Papa.parse<SheetEvent>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
    });

    if (errors.length > 0) {
        console.warn('CSV Parse errors:', errors);
    }

    return data;
}

function parseSpeakers(data?: string): Speaker[] {
    if (!data) return [];
    return data.split('|').map(s => {
        const parts = s.split(':').map(i => i.trim());
        // Expected format: Name:Role:Avatar
        return {
            name: parts[0] || 'Unknown',
            role: parts[1] || '',
            avatar: parts[2] || undefined
        };
    });
}

function parseAgenda(data?: string): AgendaItem[] {
    if (!data) return [];
    return data.split(';').map(s => {
        const parts = s.split(':', 2).map(i => i.trim());
        const time = parts[0];
        // Re-join the rest if the activity description contains colons
        const activity = s.substring(s.indexOf(':') + 1).trim();
        return { time: time || '', activity: activity || '' };
    });
}

function slugify(text: string): string {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start
        .replace(/-+$/, '');            // Trim - from end
}

function mapRowToEvent(row: SheetEvent): Event | null {
    if (!row.title || !row.startDate) {
        return null;
    }

    // Generate fallback slug if missing from sheet
    const slug = row.slug && row.slug.trim() !== ''
        ? row.slug
        : slugify(`${row.title}-${new Date(row.startDate).getFullYear()}`);

    return {
        title: row.title,
        slug,
        startDate: row.startDate,
        endDate: row.endDate,
        link: row.link,
        location: row.location || undefined,
        type: (row.type as any) || 'Meetup',
        description: row.description || undefined,
        long_description: row.long_description || undefined,
        venue_name: row.venue_name || undefined,
        venue_map: row.venue_map || undefined,
        images: row.images ? row.images.split(',').map(i => i.trim()).filter(i => i.length > 0) : [],
        speakers: parseSpeakers(row.speaker_data),
        agenda: parseAgenda(row.agenda),

        // Redesign Mappings
        community: row.community || undefined,
        cfpStatus: row.cfpStatus || undefined,
        cfpEndDate: row.cfpEndDate || undefined,
        tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
        venue: row.venue || undefined,
        featured: row.featured ? row.featured.toString().toUpperCase() === 'TRUE' : false
    };
}

// --- Public API ---

export async function getEvents(): Promise<Event[]> {
    const now = Date.now();

    if (cache && (now - cache.lastFetched < CACHE_TTL_MS)) {
        return cache.data;
    }

    try {
        const csvText = await fetchRawCSV();
        const rawRows = parseCSV(csvText);

        const events = rawRows
            .map(mapRowToEvent)
            .filter((event): event is Event => event !== null);

        cache = {
            data: events,
            lastFetched: now
        };

        return events;
    } catch (error) {
        console.error('Error fetching events:', error);
        if (cache) {
            return cache.data;
        }
        return [];
    }
}

// Helper to get a single event by slug
export async function getEvent(slug: string): Promise<Event | undefined> {
    const events = await getEvents();
    return events.find(e => e.slug === slug);
}
