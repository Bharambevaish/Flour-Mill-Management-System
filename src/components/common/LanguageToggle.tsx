"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Session-language switcher (writes the `lang` cookie + server refresh).
 *
 * Initial state comes from `initialLang` — computed server-side with
 * `getLang()` and passed down — so SSR and the first client render agree
 * (reading `document.cookie` in the initializer caused a hydration mismatch).
 */
export function LanguageToggle({ initialLang = "en" }: { initialLang?: "mr" | "en" }) {
  const router = useRouter();
  const [lang, setLang] = useState<"mr" | "en">(initialLang);

  function toggleLanguage(newLang: "mr" | "en") {
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => toggleLanguage("en")}
        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
          lang === "en"
            ? "bg-amber-600 text-white shadow-sm"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage("mr")}
        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
          lang === "mr"
            ? "bg-amber-600 text-white shadow-sm"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
