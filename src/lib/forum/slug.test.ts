import { describe, expect, it } from 'vitest';

import { threadSlug } from './slug';

describe('threadSlug', () => {
  it('slugifies a title and appends a short id to keep it unique', () => {
    const slug = threadSlug('How do I contribute to OSW?', 'abc123def');

    expect(slug).toBe('how-do-i-contribute-to-osw-abc123');
  });

  it('collapses punctuation and repeated separators', () => {
    expect(threadSlug('Rust   &&&   Go: which one?!', 'abcdef')).toBe('rust-go-which-one-abcdef');
  });

  it('truncates a very long title without leaving a trailing hyphen', () => {
    const slug = threadSlug('a'.repeat(200), 'abcdef');

    expect(slug.length).toBeLessThanOrEqual(87);
    expect(slug).not.toContain('--');
    expect(slug.endsWith('-abcdef')).toBe(true);
  });

  it('still produces a usable slug when the title has no latin characters', () => {
    expect(threadSlug('日本語', 'abcdef')).toBe('thread-abcdef');
  });

  it('lowercases everything', () => {
    expect(threadSlug('SHOUTING TITLE', 'abcdef')).toBe('shouting-title-abcdef');
  });
});
