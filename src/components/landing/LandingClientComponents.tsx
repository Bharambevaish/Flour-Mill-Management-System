"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LandingNavLanguageToggle({ initialLang = "en" }: { initialLang?: "mr" | "en" }) {
  const router = useRouter();
  const [lang, setLang] = useState<"mr" | "en">(initialLang);

  function toggleLanguage(newLang: "mr" | "en") {
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="bg-clay-50/80 p-0.5 rounded-lg border border-clay-200/60 flex items-center text-[11px] sm:text-xs font-semibold shrink-0 dark:bg-earth-800 dark:border-earth-700">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("mr")}
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded transition-colors ${
          lang === "mr"
            ? "bg-white text-clay-800 shadow-sm dark:bg-earth-700 dark:text-clay-300 font-bold"
            : "text-earth-500 hover:text-earth-800 dark:text-earth-400 dark:hover:text-earth-200"
        }`}
      >
        मराठी
      </button>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => toggleLanguage("en")}
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded transition-colors ${
          lang === "en"
            ? "bg-white text-clay-800 shadow-sm dark:bg-earth-700 dark:text-clay-300 font-bold"
            : "text-earth-500 hover:text-earth-800 dark:text-earth-400 dark:hover:text-earth-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export function CustomerTrackForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/my/login?mobile=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/my/login");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-earth-400 dark:text-earth-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </div>
        <input
          id="track-input"
          suppressHydrationWarning
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-white text-xs sm:text-sm rounded-xl border border-clay-200 focus:border-clay-600 focus:ring-1 focus:ring-clay-600 transition outline-none dark:bg-earth-800 dark:border-earth-700 dark:text-earth-100 placeholder:text-earth-400 dark:placeholder:text-earth-500"
          placeholder="Enter Mobile No. or Order Token"
          type="text"
        />
      </div>
      <button
        type="submit"
        suppressHydrationWarning
        className="bg-clay-800 hover:bg-clay-900 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm active:scale-95 cursor-pointer"
      >
        <span>Search</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </form>
  );
}
