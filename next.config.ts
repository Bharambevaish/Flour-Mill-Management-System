import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Strict CSP: no inline scripts/styles in production bundles.
      ...(process.env.NODE_ENV === "production"
        ? ([
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                "connect-src 'self'",
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