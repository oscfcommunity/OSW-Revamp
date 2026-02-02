import Papa from 'papaparse';

export interface Event {
    title: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    link: string;
    location?: string;
    type?: "Meetup" | "Workshop" | "Conference";
    description?: string;
}

interface SheetEvent {
    title: string;
    startDate: string;
    endDate: string;
    link: string;
    location: string;
    type: string;
    description: string;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface EventCache {
    data: Event[];
    lastFetched: number;
}

let cache: EventCache | null = null;

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

function mapRowToEvent(row: SheetEvent): Event | null {
    if (!row.title || !row.startDate) {
        return null;
    }

    return {
        title: row.title,
        startDate: row.startDate,
        endDate: row.endDate,
        link: row.link,
        location: row.location || undefined,
        type: (row.type as any) || 'Meetup',
        description: row.description || undefined,
    };
}

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
