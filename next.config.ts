import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * Hosts allowed to talk to the DEV server besides localhost.
 *
 * Next 16 blocks cross-origin requests to dev-only assets and the HMR socket.
 * Opening `npm run dev` from a phone or another PC on the same Wi-Fi (e.g.
 * http://192.168.1.5:3000) therefore loaded the HTML but none of the client
 * JS: the page never hydrated, so every <button> in a <form> fell back to a
 * native submit and the page reloaded on every tap — and login never worked.
 *
 * Allowed: this machine's own IPv4 addresses, the private LAN ranges
 * (10/8, 172.16/12, 192.168/16), `*.local` mDNS names, plus anything listed in
 * DEV_ALLOWED_ORIGINS (comma-separated hostnames, e.g. a tunnel domain).
 * Dev only — production (`next start`) ignores this setting.
 */
function devOrigins(): string[] {
  const own = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
  const privateLan = [
    "10.*.*.*",
    "192.168.*.*",
    ...Array.from({ length: 16 }, (_, k) => `172.${16 + k}.*.*`),
    "*.local",
  ];
  const extra = (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return [...new Set([...own, ...privateLan, ...extra])];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: devOrigins(),

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Strict CSP: no external scripts, no framing, no inline styles.
      ...(process.env.NODE_ENV === "production"
        ? ([
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                // `'unsafe-inline'` is REQUIRED here, not sloppiness. Next's RSC
                // payload ships as inline <script> bootstrap blocks with no
                // nonce, so `script-src 'self'` alone blocks them, the RSC
                // stream never arrives, and the page renders dead HTML with
                // zero interactivity — in the browser AND in the installed
                // customer app. This mirrors the no-nonce pattern in the
                // bundled Next 16 CSP guide; the hardened alternative is a
                // per-request nonce, which costs all static rendering.
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                "connect-src 'self'",
                // Without this, the manifest falls back to default-src. Harmless
                // today ('self' is allowed) but it states the dependency plainly.
                "manifest-src 'self'",
                // No worker-src: it would fall back to default-src 'self', which
                // already permits a same-origin service worker if one is added.
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
              ].join("; "),
            },
          ] as const)
        : []),
    ];

    const hsts = process.env.NODE_ENV === "production"
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
      : [];

    return [{ source: "/:path*", headers: [...securityHeaders, ...hsts] }];
  },
};

export default nextConfig;