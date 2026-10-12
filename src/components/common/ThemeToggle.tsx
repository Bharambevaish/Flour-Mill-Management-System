"use client";

import { useState } from "react";

type Theme = "dark" | "light";

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Corner theme switch. Persists the choice in the `theme` cookie so the
 * server-rendered layout (src/app/layout.tsx) applies it without a flash.
 * Self-contained so it can be re-homed into a Settings tab later as-is.
 */
export function ThemeToggle({ initialTheme }: { initialTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(isTheme(initialTheme) ? initialTheme : "dark");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "लाईट मोड / Light mode" : "डार्क मोड / Dark mode"}
      className="no-print fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-earth-300 bg-white/80 text-earth-700 shadow-md backdrop-blur transition-colors hover:bg-white dark:border-earth-700 dark:bg-earth-900/80 dark:text-earth-300 dark:hover:bg-earth-800"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}