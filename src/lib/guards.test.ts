import { describe, expect, it } from 'vitest';

import { canModerate, hasRole, isBanned, type Viewer } from './guards';

const aViewer = (overrides: Partial<Viewer> = {}): Viewer => ({
  id: 'user-1',
  role: 'user',
  bannedUntil: null,
  ...overrides,
});

describe('hasRole', () => {
  it('grants a role to the exact role holder', () => {
    expect(hasRole(aViewer({ role: 'moderator' }), 'moderator')).toBe(true);
  });

  it('lets a higher role satisfy a lower requirement', () => {
    expect(hasRole(aViewer({ role: 'admin' }), 'moderator')).toBe(true);
    expect(hasRole(aViewer({ role: 'admin' }), 'user')).toBe(true);
  });

  it('refuses a lower role for a higher requirement', () => {
    expect(hasRole(aViewer({ role: 'user' }), 'moderator')).toBe(false);
    expect(hasRole(aViewer({ role: 'moderator' }), 'admin')).toBe(false);
  });

  it('refuses anonymous visitors any role', () => {
    expect(hasRole(null, 'user')).toBe(false);
    expect(hasRole(null, 'admin')).toBe(false);
  });
});

describe('canModerate', () => {
  it('admits moderators and admins only', () => {
    expect(canModerate(aViewer({ role: 'moderator' }))).toBe(true);
    expect(canModerate(aViewer({ role: 'admin' }))).toBe(true);
    expect(canModerate(aViewer({ role: 'user' }))).toBe(false);
    expect(canModerate(null)).toBe(false);
  });
});

describe('isBanned', () => {
  const now = new Date('2026-08-12T12:00:00Z');

  it('treats a viewer with no ban as active', () => {
    expect(isBanned(aViewer(), now)).toBe(false);
  });

  it('treats a ban that ends in the future as active', () => {
    expect(isBanned(aViewer({ bannedUntil: new Date('2026-09-01T00:00:00Z') }), now)).toBe(true);
  });

  it('treats an expired ban as lifted', () => {
    expect(isBanned(aViewer({ bannedUntil: new Date('2026-08-01T00:00:00Z') }), now)).toBe(false);
  });

  it('treats an anonymous visitor as not banned', () => {
    expect(isBanned(null, now)).toBe(false);
  });
});
