/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * Drizzle wraps driver errors, so the Postgres code lives on the cause rather
 * than on the error itself, and the message text does not mention the
 * constraint. Walk the chain and match on the code.
 */
export const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (candidate.code === UNIQUE_VIOLATION) {
      return constraint === undefined || candidate.constraint === constraint;
    }
    current = candidate.cause;
  }

  return false;
};
