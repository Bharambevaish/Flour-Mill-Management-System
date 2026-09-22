import "server-only";

import { AppError } from "@/lib/errors";

/** Success JSON helper */
export function ok<T extends Record<string, unknown>>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

/** Error JSON helper — hides internal detail, logs the real error server-side. */
export function fail(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code ?? "APP_ERROR", message: error.message } },
      { status: error.status },
    );
  }

  console.error("[api] unhandled error:", error);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong" } },
    { status: 500 },
  );
}

/** Try/catch wrapper for route handlers */
export async function handle<TFn extends (...args: never[]) => Promise<Response>>(
  fn: TFn,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}

/** Minimum-typed request-body helper: parse JSON with a size cap and graceful failure. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > 64 * 1024) throw new AppError(413, "Body too large", "PAYLOAD_TOO_LARGE");
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError(400, "Invalid JSON body", "INVALID_BODY");
    }
    throw error;
  }
}

/** True for state-changing methods (which we CSRF-protect). */
export function isMutating(request: Request): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase());
}