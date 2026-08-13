import { describe, expect, it } from 'vitest';

import { suggestUsername, validateUsername } from './username';

describe('suggestUsername', () => {
  it('builds one from a display name', () => {
    expect(suggestUsername('Ashish Vaghela', 'a@b.test')).toBe('ashish-vaghela');
  });

  it('falls back to the email local part when there is no usable name', () => {
    expect(suggestUsername('', 'ashish.vaghela@nelkinda.com')).toBe('ashish-vaghela');
    expect(suggestUsername('🎉', 'someone@example.com')).toBe('someone');
  });

  it('strips characters that do not belong in a URL', () => {
    expect(suggestUsername("Ana O'Brien-Smith", 'a@b.test')).toBe('ana-obrien-smith');
  });

  it('collapses repeated separators and trims them from the ends', () => {
    expect(suggestUsername('  --Ada   Lovelace--  ', 'a@b.test')).toBe('ada-lovelace');
  });

  it('truncates a very long name without leaving a trailing separator', () => {
    const suggestion = suggestUsername('a'.repeat(60), 'a@b.test');

    expect(suggestion.length).toBeLessThanOrEqual(30);
    expect(suggestion.endsWith('-')).toBe(false);
  });

  it('always produces something usable, even from unusable input', () => {
    expect(suggestUsername('', '')).toMatch(/^member/);
  });
});

describe('validateUsername', () => {
  it('accepts lowercase letters, numbers and hyphens', () => {
    expect(validateUsername('ashish-01')).toEqual({ ok: true, username: 'ashish-01' });
  });

  it('lowercases what the member typed rather than rejecting it', () => {
    expect(validateUsername('Ashish')).toEqual({ ok: true, username: 'ashish' });
  });

  it('rejects one that is too short or too long', () => {
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('a'.repeat(31)).ok).toBe(false);
  });

  it('rejects spaces and punctuation rather than silently mangling them', () => {
    expect(validateUsername('ashish vaghela').ok).toBe(false);
    expect(validateUsername('ashish.vaghela').ok).toBe(false);
    expect(validateUsername('ashish/../admin').ok).toBe(false);
  });

  it('rejects leading and trailing hyphens', () => {
    expect(validateUsername('-ashish').ok).toBe(false);
    expect(validateUsername('ashish-').ok).toBe(false);
  });

  it('refuses names that would collide with the site’s own routes', () => {
    for (const reserved of ['admin', 'settings', 'login', 'forum', 'events', 'jobs', 'api']) {
      expect(validateUsername(reserved).ok).toBe(false);
    }
  });

  it('explains why, so the form can say something useful', () => {
    const result = validateUsername('ab');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/3/);
    }
  });
});
