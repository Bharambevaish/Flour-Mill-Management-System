"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { t, type Lang } from "@/lib/i18n/dict";

/**
 * Session-language aware logout control. `lang` arrives as a prop (the caller
 * reads it server-side) so SSR and the first client render agree — reading
 * `document.cookie` in a `useState` initializer caused a hydration mismatch.
 */
export function LogoutButton({ lang = "en" }: { lang?: Lang }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const res = await apiFetch("/api/auth/logout");
    router.push("/");
    void res;
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="min-h-10 rounded-lg border border-[var(--border-strong)] bg-transparent px-3.5 py-1.5 text-sm font-semibold text-earth-700 transition-colors hover:bg-earth-100 hover:text-heading disabled:opacity-60 dark:text-earth-300 dark:hover:bg-earth-800"
    >
      {pending ? "..." : t("logout", lang)}
    </button>
  );
}
