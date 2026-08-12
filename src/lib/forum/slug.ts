const MAX_TITLE_LENGTH = 80;
const SHORT_ID_LENGTH = 6;

/**
 * Readable thread slugs, kept unique by a short id suffix. Two threads may share
 * a title; the suffix means neither has to be renamed.
 */
export const threadSlug = (title: string, id: string): string => {
  const shortId = id
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, SHORT_ID_LENGTH)
    .toLowerCase();

  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/-$/, '');

  return `${base || 'thread'}-${shortId}`;
};
