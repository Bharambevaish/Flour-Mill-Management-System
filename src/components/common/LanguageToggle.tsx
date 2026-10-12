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
    <div className="inline-flex items-center rounded-lg border border-[var(--border-strong)] bg-surface p-0.5">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("en")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          lang === "en"
            ? "bg-earth-900 text-white dark:bg-earth-100 dark:text-earth-900"
            : "text-earth-600 hover:text-heading dark:text-earth-400"
        }`}
      >
        English
      </button>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("mr")}
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
          lang === "mr"
            ? "bg-earth-900 text-white dark:bg-earth-100 dark:text-earth-900"
            : "text-earth-600 hover:text-heading dark:text-earth-400"
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
