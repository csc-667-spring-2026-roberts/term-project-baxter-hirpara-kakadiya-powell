/**
 * @file util/error.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * Error objects.
 */

/**
 * Helper class for creating Http Errors.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Wrapper to typecheck DB RollbackErrors
 */
export class RollbackError extends Error {}
