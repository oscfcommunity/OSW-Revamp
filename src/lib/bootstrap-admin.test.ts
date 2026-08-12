import { describe, expect, it } from 'vitest';

import { shouldPromoteToAdmin } from './bootstrap-admin';

describe('shouldPromoteToAdmin', () => {
  it('promotes an email listed in the configured admins', () => {
    expect(shouldPromoteToAdmin('me@osw.org', 'user', 'me@osw.org')).toBe(true);
  });

  it('matches case insensitively and ignores surrounding whitespace', () => {
    expect(shouldPromoteToAdmin('Me@OSW.org', 'user', ' me@osw.org , other@osw.org')).toBe(true);
  });

  it('leaves an existing admin alone rather than writing on every request', () => {
    expect(shouldPromoteToAdmin('me@osw.org', 'admin', 'me@osw.org')).toBe(false);
  });

  it('promotes a moderator who is also listed as an admin', () => {
    expect(shouldPromoteToAdmin('me@osw.org', 'moderator', 'me@osw.org')).toBe(true);
  });

  it('refuses an email that is not listed', () => {
    expect(shouldPromoteToAdmin('someone@else.test', 'user', 'me@osw.org')).toBe(false);
  });

  it('refuses everyone when no admin emails are configured', () => {
    expect(shouldPromoteToAdmin('me@osw.org', 'user', undefined)).toBe(false);
    expect(shouldPromoteToAdmin('me@osw.org', 'user', '')).toBe(false);
    expect(shouldPromoteToAdmin('me@osw.org', 'user', '  ,  ')).toBe(false);
  });

  it('refuses a blank email, which must never match an empty list entry', () => {
    expect(shouldPromoteToAdmin('', 'user', 'me@osw.org,')).toBe(false);
  });
});
