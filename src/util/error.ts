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
    message: string = "A HTTP error has occurred",
    public status: number = 404,
  ) {
    super(message);
  }
}

/**
 * Helper class for API response errors (optional body to send).
 * default: "An unexpected error has occurred", {}, 500
 */
export class ResponseError extends Error {
  constructor(
    public body: Record<string, unknown> = {},
    message: string = "A response error has occurred",
    public status: number = 500,
  ) {
    super(message);
  }
}

/**
 * Wrapper to typecheck DB RollbackErrors
 */
export class RollbackError extends Error {}
