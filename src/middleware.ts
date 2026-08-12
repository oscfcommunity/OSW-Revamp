import { defineMiddleware, sequence } from 'astro:middleware';
import { ADMIN_EMAILS } from 'astro:env/server';

import { auth } from './lib/auth';
import { promoteToAdmin, shouldPromoteToAdmin } from './lib/bootstrap-admin';
import { canModerate, type Role, type Viewer } from './lib/guards';

const AUTHORING_PREFIXES = ['/forum/new', '/settings', '/submit', '/profile/edit'] as const;

const toViewer = (user: { id: string; role?: unknown; bannedUntil?: unknown }): Viewer => ({
  id: user.id,
  role: (typeof user.role === 'string' ? user.role : 'user') as Role,
  bannedUntil:
    user.bannedUntil instanceof Date
      ? user.bannedUntil
      : typeof user.bannedUntil === 'string'
        ? new Date(user.bannedUntil)
        : null,
});

const withSession = defineMiddleware(async (context, next) => {
  const data = await auth.api.getSession({ headers: context.request.headers });

  if (!data?.user) {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.viewer = null;
    return next();
  }

  let viewer = toViewer(data.user);

  if (shouldPromoteToAdmin(data.user.email, viewer.role, ADMIN_EMAILS)) {
    await promoteToAdmin(viewer.id);
    viewer = { ...viewer, role: 'admin' };
  }

  context.locals.user = { ...data.user, role: viewer.role };
  context.locals.session = data.session;
  context.locals.viewer = viewer;

  return next();
});

const guard = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const { viewer } = context.locals;

  const signIn = (): Response =>
    context.redirect(`/login?next=${encodeURIComponent(pathname + context.url.search)}`);

  if (pathname.startsWith('/admin')) {
    if (!viewer) {
      return signIn();
    }
    if (!canModerate(viewer)) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  if (!viewer && AUTHORING_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return signIn();
  }

  return next();
});

export const onRequest = sequence(withSession, guard);
