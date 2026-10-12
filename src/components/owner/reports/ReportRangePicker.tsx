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
    <div className="no-print flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-soft dark:border-earth-800 dark:bg-earth-900">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => go(`preset=${p.key}`)}
            className={
              preset === p.key
                ? "stitch-btn-primary text-xs sm:text-sm px-3.5 py-1.5"
                : "stitch-btn-secondary text-xs sm:text-sm px-3.5 py-1.5"
            }
          >
            {lang === "mr" ? p.mr : p.en}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-clay-100 sm:border-l sm:pl-4 dark:border-earth-700">
        <label className="flex flex-col gap-1 text-xs font-semibold text-earth-600 dark:text-earth-400">
          {lang === "mr" ? "पासून" : "From"}
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="stitch-input px-2.5 py-1.5 text-xs sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-earth-600 dark:text-earth-400">
          {lang === "mr" ? "पर्यंत" : "To"}
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="stitch-input px-2.5 py-1.5 text-xs sm:text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!customValid}
          onClick={() => go(`preset=custom&from=${customFrom}&to=${customTo}`)}
          className="stitch-btn-primary text-xs sm:text-sm px-4 py-2"
        >
          {lang === "mr" ? "लागू करा" : "Apply"}
        </button>
      </div>
    </div>
  );
}
