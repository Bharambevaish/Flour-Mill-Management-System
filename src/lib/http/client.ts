"use client";

/**
 * Client-side fetch wrapper that handles the double-submit CSRF token:
 * - fetches /api/csrf once per app load (sets the non-httpOnly cookie)
 * - echoes the token in the `x-csrf-token` header on mutating requests
 */

let csrfToken: string | null = null;

/** Endpoints that legitimately answer 401 while the session is expected to be absent. */
const AUTH_BYPASS = new Set([
  "/api/auth/owner/login",
  "/api/auth/customer/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/csrf",
]);

let redirectingToLogin = false;

/**
 * Expire the auth cookies from the browser. A revoked/expired session leaves a
 * stale httpOnly cookie behind; the proxy only checks cookie *presence*, so
 * that stale cookie would keep bouncing `/login` → `/owner` → "session
 * expired" forever. Clearing it here breaks that loop. (Setting an expired
 * cookie with a matching name/path removes it even when httpOnly.)
 */
export function clearAuthCookies(): void {
  const names = ["fm_owner", "fm_customer", "fm_csrf", "__Host-fm_owner", "__Host-fm_customer", "__Host-fm_csrf"];
  for (const name of names) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  }
}

/**
 * A stale/expired session surfaces as a 401 (code UNAUTHORIZED) from any
 * protected endpoint. When that happens while the user is inside the owner or
 * customer area, send them (once) to the login screen with the bilingual
 * "session expired — please log in again" notice instead of leaving scattered
 * inline errors or a raw browser error on screen.
 */
function redirectIfSessionExpired(path: string): void {
  if (redirectingToLogin) return;
  if (AUTH_BYPASS.has(path)) return;

  const { pathname } = window.location;
  const isOwner = pathname.startsWith("/owner");
  const isCustomer = pathname.startsWith("/my");
  if (!isOwner && !isCustomer) return;
  if (pathname === "/login" || pathname === "/my/login") return;

  redirectingToLogin = true;
  clearAuthCookies();
  window.location.assign(
    isCustomer ? "/my/login?error=session_expired" : "/login?error=session_expired",
  );
}

export async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
    const data = (await res.json()) as { csrfToken?: string };
    csrfToken = data.csrfToken ?? null;
  } catch {
    csrfToken = null;
  }
  return csrfToken ?? "";
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: { code?: string; message?: string; retryAfter?: number };
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface ApiBody {
  csrfToken?: string;
  error?: { code?: string; message?: string; retryAfter?: number };
}

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? "POST";

  if (MUTATING.has(method)) {
    await ensureCsrf();
  }

  const headers: Record<string, string> = {};
  // FormData must go out raw: the browser has to append its own multipart
  // boundary, so setting Content-Type (or stringifying) breaks the upload. The
  // UPI QR upload is the first caller that needs this.
  const isMultipart = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isMultipart) headers["Content-Type"] = "application/json";
  if (csrfToken && MUTATING.has(method)) headers["x-csrf-token"] = csrfToken;

  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers,
    body:
      options.body === undefined
        ? undefined
        : isMultipart
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  });

  const payload = (await res.json().catch(() => ({}))) as T & ApiBody;

  // Adopt a rotated CSRF token (e.g. returned by login) so follow-up calls stay valid.
  if (typeof payload.csrfToken === "string") {
    csrfToken = payload.csrfToken;
  }

  // Session died mid-use → clean redirect to the login page with a notice.
  if (res.status === 401 && payload.error?.code === "UNAUTHORIZED") {
    redirectIfSessionExpired(path);
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? { message: "Request failed" },
    };
  }

  return { ok: true, status: res.status, data: payload };
}