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
    <div className="inline-flex items-center rounded-xl border border-rose-200/80 bg-rose-50/60 p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("en")}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
          lang === "en"
            ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs"
            : "text-rose-900/70 hover:text-rose-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        English
      </button>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("mr")}
        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
          lang === "mr"
            ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs"
            : "text-rose-900/70 hover:text-rose-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`}
      >
        मराठी
      </button>
    </div>
  );
}
