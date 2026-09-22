"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n/i18n";

const PRESETS = [
  { key: "today", mr: "आज", en: "Today" },
  { key: "7d", mr: "७ दिवस", en: "7 days" },
  { key: "30d", mr: "३० दिवस", en: "30 days" },
] as const;

/** Preset pills + custom date inputs; navigates by URL so the server re-runs the report. */
export function ReportRangePicker({
  preset,
  from,
  to,
  lang,
}: {
  preset: string;
  from: string;
  to: string;
  lang: Lang;
}) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(query: string) {
    router.push(`/owner/reports?${query}`);
  }

  const customValid = !!customFrom && !!customTo && customFrom <= customTo;

  return (
    <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => go(`preset=${p.key}`)}
            className={
              preset === p.key
                ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
          >
            {lang === "mr" ? p.mr : p.en}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-zinc-200 sm:border-l sm:pl-3 dark:border-zinc-700">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          {lang === "mr" ? "पासून" : "From"}
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          {lang === "mr" ? "पर्यंत" : "To"}
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        <button
          type="button"
          disabled={!customValid}
          onClick={() => go(`preset=custom&from=${customFrom}&to=${customTo}`)}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {lang === "mr" ? "लागू करा" : "Apply"}
        </button>
      </div>
    </div>
  );
}
