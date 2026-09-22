import "server-only";

import type { LoginContext } from "@/services/authService";

/** Best-effort client IP from common proxy headers. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
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