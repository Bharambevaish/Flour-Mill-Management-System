import "server-only";

/**
 * Central cookie naming & options.
 *
 * Secure cookies (and the `__Host-` prefix, which requires Secure) are used ONLY
 * when the traffic is actually encrypted — i.e. behind HTTPS. Switching between
 * `next dev` and `next start` on http://localhost must never change the cookie
 * name or the Secure flag, or every mode switch would look like a sign-out.
 *
 * Rules:
 *   - AUTH_COOKIE_SECURE=true   → Secure + `__Host-` always.
 *   - AUTH_COOKIE_SECURE=false  → plain cookie, no Secure.
 *   - unset                     → Secure + `__Host-` only when running as a
 *                                   production build served over HTTPS.
 */

export type SessionKind = "owner" | "customer";

const isProd = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const secureFlag = process.env.AUTH_COOKIE_SECURE;
const useSecure = secureFlag
  ? secureFlag === "true"
  : isProd && new URL(appUrl).protocol === "https:";

function name(base: string): string {
  return useSecure ? `__Host-${base}` : base;
}

export const COOKIES = {
  ownerSession: name("fm_owner"),
  customerSession: name("fm_customer"),
  csrf: name("fm_csrf"),
} as const;

export const cookieOptions = {
  httpOnly: true,
  secure: useSecure,
  sameSite: "lax" as const,
  path: "/",
};

export const csrfCookieOptions = {
  httpOnly: false, // must be readable by client JS so it can echo the header
  secure: useSecure,
  sameSite: "lax" as const,
  path: "/",
};

export { isProd };