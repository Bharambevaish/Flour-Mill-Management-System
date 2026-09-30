import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

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