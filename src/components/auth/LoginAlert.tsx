"use client";

import { useEffect } from "react";
import { clearAuthCookies } from "@/lib/client";

/**
 * Bilingual login-page notice for a state carried via the `error` query param.
 *
 * On mount it confirms the session is really gone before touching anything:
 *  - `/api/auth/me` still answers 200 → the session is valid, so send the user
 *    straight to their area instead of logging them out.
 *  - `/api/auth/me` answers 401 → drop the stale auth cookies (otherwise the
 *    proxy keeps bouncing this page back to /owner and the "session expired"
 *    loop never ends) and strip `?error=` from the URL so a refresh is clean.
 */
export function LoginAlert() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let valid = false;
      let kind: "owner" | "customer" | null = null;
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { kind?: "owner" | "customer" };
          valid = true;
          kind = data.kind ?? null;
        }
      } catch {
        // Network hiccup: fall through and just clean the URL.
      }
      if (cancelled) return;

      if (valid) {
        window.location.assign(kind === "customer" ? "/my" : "/owner");
        return;
      }

      clearAuthCookies();
      const url = new URL(window.location.href);
      if (url.searchParams.has("error")) {
        url.searchParams.delete("error");
        window.history.replaceState(null, "", url.toString());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-haldi-200 bg-haldi-50 p-3 text-xs font-semibold text-haldi-900 shadow-xs dark:border-haldi-500/40 dark:bg-haldi-400/10 dark:text-haldi-200">
      तुमचे सत्र संपले आहे — कृपया पुन्हा लॉगिन करा. / Your session expired — please try
      logging in again.
    </div>
  );
}