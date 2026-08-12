export type Role = 'user' | 'moderator' | 'admin';

export type Viewer = {
  readonly id: string;
  readonly role: Role;
  readonly bannedUntil: Date | null;
};

const RANK: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

/**
 * Route middleware only decides where to send a browser. These predicates are the
 * actual authorisation boundary and must be called inside every mutation.
 */
export const hasRole = (viewer: Viewer | null, required: Role): boolean =>
  viewer !== null && RANK[viewer.role] >= RANK[required];

export const canModerate = (viewer: Viewer | null): boolean => hasRole(viewer, 'moderator');

export const isAdmin = (viewer: Viewer | null): boolean => hasRole(viewer, 'admin');

export const isBanned = (viewer: Viewer | null, now: Date = new Date()): boolean =>
  viewer?.bannedUntil != null && viewer.bannedUntil > now;

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export const requireUser = (viewer: Viewer | null): Viewer => {
  if (!viewer) {
    throw new AuthorizationError('You must be signed in to do that.', 401);
  }
  if (isBanned(viewer)) {
    throw new AuthorizationError('Your account is suspended.', 403);
  }
  return viewer;
};

export const requireRole = (viewer: Viewer | null, required: Role): Viewer => {
  const active = requireUser(viewer);
  if (!hasRole(active, required)) {
    throw new AuthorizationError('You do not have permission to do that.', 403);
  }
  return active;
};
