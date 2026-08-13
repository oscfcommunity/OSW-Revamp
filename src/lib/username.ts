const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

/**
 * Names that would collide with a real route. A member called "admin" would
 * otherwise own /u/admin, which is harmless, but "settings" or "api" reads as
 * though it belongs to the site and invites confusion.
 */
const RESERVED = new Set([
  'admin',
  'api',
  'settings',
  'login',
  'logout',
  'forum',
  'events',
  'jobs',
  'about',
  'blog',
  'search',
  'u',
  'me',
  'new',
  'submit',
  'privacy',
  'terms',
  'moderator',
  'support',
  'help',
  'osw',
  'opensourceweekend',
]);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-$/, '');

/**
 * A starting point for a member's public address, derived from what we already
 * know about them. It is only a suggestion: uniqueness is settled by the
 * database, and the member can change it.
 */
export const suggestUsername = (name: string, email: string): string => {
  const fromName = slugify(name);
  if (fromName.length >= MIN_LENGTH) {
    return fromName;
  }

  const fromEmail = slugify(email.split('@')[0] ?? '');
  if (fromEmail.length >= MIN_LENGTH) {
    return fromEmail;
  }

  return `member-${Math.random().toString(36).slice(2, 8)}`;
};

export type UsernameResult = { ok: true; username: string } | { ok: false; reason: string };

export const validateUsername = (input: string): UsernameResult => {
  // Case is normalised rather than rejected: someone typing their name with a
  // capital meant the same username.
  const username = input.trim().toLowerCase();

  if (username.length < MIN_LENGTH) {
    return { ok: false, reason: `Usernames need at least ${MIN_LENGTH} characters.` };
  }
  if (username.length > MAX_LENGTH) {
    return { ok: false, reason: `Usernames can be at most ${MAX_LENGTH} characters.` };
  }
  if (!/^[a-z0-9-]+$/.test(username)) {
    return { ok: false, reason: 'Use lowercase letters, numbers and hyphens only.' };
  }
  if (username.startsWith('-') || username.endsWith('-')) {
    return { ok: false, reason: 'Usernames cannot start or end with a hyphen.' };
  }
  if (RESERVED.has(username)) {
    return { ok: false, reason: 'That username is reserved.' };
  }

  return { ok: true, username };
};
