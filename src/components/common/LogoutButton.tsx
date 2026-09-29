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
      className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-900 shadow-xs transition-all hover:bg-rose-50 hover:border-rose-300 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700"
    >
      {pending ? "..." : t("logout", lang)}
    </button>
  );
}
