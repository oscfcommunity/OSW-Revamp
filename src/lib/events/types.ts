export const EVENT_TYPES = ['Meetup', 'Workshop', 'Conference', 'Hackathon'] as const;
export const ATTENDANCE_MODES = ['In-person', 'Hybrid', 'Online'] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];

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

/**
 * The domain type every page renders. Both the sheet backend and the database
 * backend map onto it, so swapping storage never reaches the templates.
 */
export interface Event {
  title: string;
  slug: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  link: string;
  location?: string;
  /** What kind of event it is. */
  type?: EventType;
  /**
   * How people attend. The Google Sheet records this in its "type" column, which
   * is why it is read separately from the event kind.
   */
  attendanceMode?: AttendanceMode;
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
