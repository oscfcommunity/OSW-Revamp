const WEB_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Hostname of an external link, or null when the link is missing, relative or
 * not a web URL. Sheet-authored links are frequently blank, so callers must not
 * be exposed to a throwing `new URL()`.
 */
export const hostnameOf = (link: string | undefined): string | null => {
  if (!link) {
    return null;
  }

  try {
    const url = new URL(link);
    if (!WEB_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};
