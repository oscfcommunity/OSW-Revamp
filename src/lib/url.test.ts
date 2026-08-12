import { describe, expect, it } from 'vitest';

import { hostnameOf } from './url';

describe('hostnameOf', () => {
  it('returns the hostname of an absolute url', () => {
    expect(hostnameOf('https://example.com/events/osw')).toBe('example.com');
  });

  it('drops a leading www so the label stays short', () => {
    expect(hostnameOf('https://www.meetup.com/osw')).toBe('meetup.com');
  });

  it('returns null for a blank link', () => {
    expect(hostnameOf('')).toBeNull();
    expect(hostnameOf(undefined)).toBeNull();
  });

  it('returns null rather than throwing for a malformed link', () => {
    expect(hostnameOf('not a url')).toBeNull();
  });

  it('returns null for a relative link, which has no host', () => {
    expect(hostnameOf('/events/osw')).toBeNull();
  });

  it('ignores non-http protocols', () => {
    expect(hostnameOf('javascript:alert(1)')).toBeNull();
    expect(hostnameOf('mailto:hi@example.com')).toBeNull();
  });
});
