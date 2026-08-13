import { describe, expect, it } from 'vitest';

import { profileDescription } from './visibility';

/**
 * A private profile hides its bio in the body, but the meta description is
 * emitted for every viewer. Using the bio there leaked exactly the text the page
 * was hiding, which is what these tests exist to prevent.
 */
describe('profileDescription', () => {
  it('uses the bio when the viewer may see the profile', () => {
    expect(profileDescription({ name: 'Ada', bio: 'Kernel tinkerer.', canSee: true })).toBe(
      'Kernel tinkerer.',
    );
  });

  it('never uses the bio when the profile is hidden from the viewer', () => {
    const description = profileDescription({
      name: 'Ada',
      bio: 'Something private.',
      canSee: false,
    });

    expect(description).not.toContain('Something private.');
    expect(description).toContain('Ada');
  });

  it('falls back to a generic line when there is no bio', () => {
    expect(profileDescription({ name: 'Ada', bio: null, canSee: true })).toContain('Ada');
  });
});
