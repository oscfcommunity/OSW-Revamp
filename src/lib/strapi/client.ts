import { STRAPI_TOKEN, STRAPI_URL } from 'astro:env/server';

export interface StrapiListResponse<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageCount: number; total: number } };
}

export class StrapiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'StrapiError';
  }
}

const baseUrl = (): string => {
  if (!STRAPI_URL) {
    throw new StrapiError('STRAPI_URL is not set');
  }
  return STRAPI_URL.replace(/\/$/, '');
};

/**
 * Reads a collection from Strapi, following pagination to the end. Strapi caps a
 * page at 100 entries, and the job board is already past 200, so a single request
 * would silently truncate the board.
 */
export const fetchCollection = async <T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T[]> => {
  const collected: T[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(`${baseUrl()}/api/${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('pagination[page]', String(page));
    url.searchParams.set('pagination[pageSize]', '100');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
      },
    });

    if (!response.ok) {
      throw new StrapiError(
        `Strapi request for ${path} failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const body = (await response.json()) as StrapiListResponse<T>;
    collected.push(...(body.data ?? []));

    const pageCount = body.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      return collected;
    }
    page += 1;
  }
};
