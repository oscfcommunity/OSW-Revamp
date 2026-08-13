import { describe, expect, it } from 'vitest';

import { isUniqueViolation } from './db-errors';

const pgError = (constraint: string): Error =>
  Object.assign(new Error('duplicate key'), { code: '23505', constraint });

describe('isUniqueViolation', () => {
  it('recognises a unique violation raised directly', () => {
    expect(isUniqueViolation(pgError('user_username_unique'))).toBe(true);
  });

  it('finds one wrapped by Drizzle, where the message does not mention it', () => {
    const wrapped = Object.assign(new Error('Failed query: update "user" set ...'), {
      cause: pgError('user_username_unique'),
    });

    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it('can require a specific constraint', () => {
    const error = pgError('user_email_unique');

    expect(isUniqueViolation(error, 'user_username_unique')).toBe(false);
    expect(isUniqueViolation(error, 'user_email_unique')).toBe(true);
  });

  it('ignores other database errors', () => {
    expect(isUniqueViolation(Object.assign(new Error('nope'), { code: '23503' }))).toBe(false);
    expect(isUniqueViolation(new Error('plain'))).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });

  it('does not loop forever on a self-referencing cause', () => {
    const looped: { cause?: unknown } = {};
    looped.cause = looped;

    expect(isUniqueViolation(looped)).toBe(false);
  });
});
