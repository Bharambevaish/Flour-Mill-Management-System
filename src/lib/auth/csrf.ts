import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIES, csrfCookieOptions } from "@/lib/cookies";
import { randomToken, safeEqual } from "@/lib/crypto";
import { AppError } from "@/lib/errors";
import { isMutating } from "@/lib/http";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-secret";

/**
 * Synchronizer / double-submit CSRF protection.
 *
 * - `/api/csrf` issues a non-httpOnly cookie (`fm_csrf`) with a random value.
 * - The client echoes that value in the `x-csrf-token` header on mutations.
 * - `verifyCsrf` requires them to match (constant-time).
 *
 * Defense in depth: session cookies are SameSite=Lax, which already stops most
 * cross-site sends; this covers the remaining (method-override / subdomain) gaps.
 */

const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hour

function signedToken(plain: string): string {
  return createHmac("sha256", SESSION_SECRET).update(plain).digest("hex");
}

/** Issue a fresh CSRF cookie + return the value to echo. Call on page load / login. */
export async function issueCsrf(): Promise<string> {
  const token = randomToken(24);
  const store = await cookies();
  store.set(COOKIES.csrf, `${token}.${signedToken(token)}`, {
    ...csrfCookieOptions,
    maxAge: CSRF_TTL_MS / 1000,
  });
  return token;
}

/** Verify the header matches the signed cookie on mutating requests. */
export async function verifyCsrf(request: Request): Promise<void> {
  if (!isMutating(request)) return;

  const store = await cookies();
  const cookie = store.get(COOKIES.csrf)?.value;
  const header = request.headers.get(CSRF_HEADER);

  if (!cookie || !header) {
    throw new AppError(403, "Missing CSRF token", "CSRF_MISSING");
  }

  const [cookiePlain, cookieSig] = cookie.split(".");
  const expectedSig = signedToken(cookiePlain ?? "");

  if (
    !cookiePlain ||
    !cookieSig ||
    !safeEqual(cookieSig, expectedSig) ||
    !safeEqual(header, cookiePlain)
  ) {
    throw new AppError(403, "Invalid CSRF token", "CSRF_INVALID");
  }
}

export { isMutating };