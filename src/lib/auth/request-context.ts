import "server-only";

import type { LoginContext } from "@/services/authService";
import { getEnv } from "@/lib/env";

/**
 * Best-effort client IP. `X-Forwarded-For` is ONLY trusted when the app is
 * deployed behind your own reverse proxy and TRUST_PROXY=true. Otherwise a
 * client could spoof the header per request and defeat every IP rate limit.
 */
export function clientIp(request: Request): string {
  const { TRUST_PROXY } = getEnv();
  if (TRUST_PROXY === "true") {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip") ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function clientContext(request: Request): LoginContext {
  const userAgent = request.headers.get("user-agent") ?? undefined;
  return {
    ip: clientIp(request),
    userAgent,
    device: normalizeDevice(userAgent),
  };
}

function normalizeDevice(userAgent?: string): string {
  if (!userAgent) return "unknown-device";
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}