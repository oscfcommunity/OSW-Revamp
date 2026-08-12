import type { APIRoute } from 'astro';

import { auth } from '../lib/auth';

export const prerender = false;

/** POST-only: a GET logout link would let any page sign a visitor out. */
export const POST: APIRoute = async ({ request, redirect }) => {
  const signOut = await auth.api.signOut({ headers: request.headers, asResponse: true });

  const response = redirect('/', 303);
  const setCookie = signOut.headers.get('set-cookie');
  if (setCookie) {
    response.headers.append('set-cookie', setCookie);
  }
  return response;
};
