import "server-only";

/**
 * AppError: an error carrying an HTTP status code. Route handlers translate
 * these into JSON responses; anything else is a 500.
 */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundError(message = "Not found"): AppError {
  return new AppError(404, message, "NOT_FOUND");
}

export function forbiddenError(message = "Forbidden"): AppError {
  return new AppError(403, message, "FORBIDDEN");
}

export function unauthorizedError(message = "Unauthorized"): AppError {
  return new AppError(401, message, "UNAUTHORIZED");
}

export function badRequestError(message = "Bad request"): AppError {
  return new AppError(400, message, "BAD_REQUEST");
}