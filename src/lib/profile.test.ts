import { describe, expect, it } from 'vitest';

import { parseSkills, profileUrl } from './profile';

describe('parseSkills', () => {
  it('splits a comma separated list', () => {
    expect(parseSkills('TypeScript, Postgres, Rust')).toEqual(['TypeScript', 'Postgres', 'Rust']);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(parseSkills(' Go ,, , Kubernetes ')).toEqual(['Go', 'Kubernetes']);
  });

  it('removes duplicates, keeping the first spelling', () => {
    expect(parseSkills('Rust, rust, RUST')).toEqual(['Rust']);
  });

  it('caps the list so one member cannot fill the page', () => {
    const many = Array.from({ length: 40 }, (_, index) => `skill-${index}`).join(', ');

    expect(parseSkills(many)).toHaveLength(20);
  });

  it('returns an empty list for blank input', () => {
    expect(parseSkills('')).toEqual([]);
    expect(parseSkills('   ')).toEqual([]);
    expect(parseSkills(undefined)).toEqual([]);
  });
});

describe('profileUrl', () => {
  it('accepts an http and https url', () => {
    expect(profileUrl('https://example.com')).toBe('https://example.com');
    expect(profileUrl('http://example.com')).toBe('http://example.com');
  });

  it('adds https to a bare domain, which is what people actually type', () => {
    expect(profileUrl('example.com')).toBe('https://example.com');
    expect(profileUrl('github.com/ashish')).toBe('https://github.com/ashish');
  });

  it('refuses a javascript url', () => {
    expect(profileUrl('javascript:alert(1)')).toBeNull();
  });

  it('refuses anything that is not a url', () => {
    expect(profileUrl('not a url at all')).toBeNull();
  });

  it('returns null for blank input', () => {
    expect(profileUrl('')).toBeNull();
    expect(profileUrl(undefined)).toBeNull();
  });
});
