"use client";

import { useState } from "react";
import type { OrderStatus } from "@/models/Order";
import type { OrderView } from "@/services/orderService";
import type { Lang } from "@/lib/i18n/i18n";

const STEPS: OrderStatus[] = ["pending", "processing", "completed", "collected"];

const STEP_LABEL: Record<OrderStatus, { mr: string; en: string }> = {
  pending: { mr: "रांगेत", en: "Queued" },
  processing: { mr: "दळण सुरू", en: "Milling" },
  completed: { mr: "तयार", en: "Ready" },
  collected: { mr: "घेतले", en: "Collected" },
};

const fmtTime = (iso: string, locale: string): string =>
  new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The order's journey as a compact 4-step progress bar (रांगेत → दळण सुरू →
 * तयार → घेतले). Always shows the thin bar; tapping "View times" expands a
 * vertical timeline with the timestamp of every reached step. Steps that were
 * definitively reached but have no stored time (legacy orders) show "time n/a".
 */
export function OrderProgress({
  order,
  lang,
}: {
  order: OrderView;
  lang: Lang;
}) {
  const [showTimes, setShowTimes] = useState(false);
  const mr = lang === "mr";
  const locale = mr ? "mr-IN" : "en-IN";

  const current = STEPS.indexOf(order.status);
  const at = new Map<string, string>();
  for (const h of order.statusHistory) at.set(h.status, h.at);

  return (
    <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
      {/* Thin 4-step bar: dot row over a filled track */}
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-1.5 h-0.5 rounded bg-zinc-300 dark:bg-zinc-600">
          <div
            className="h-full rounded bg-emerald-500 dark:bg-emerald-400"
            style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-4">
          {STEPS.map((s, i) => {
            const reached = i <= current;
            const isCurrent = i === current;
            const dot = isCurrent
              ? "bg-emerald-600 ring-4 ring-emerald-600/20 dark:bg-emerald-400 dark:ring-emerald-400/20"
              : reached
                ? "bg-emerald-600 dark:bg-emerald-400"
                : "bg-zinc-300 dark:bg-zinc-600";
            return (
              <div key={s} className="flex flex-col items-center">
                <span
                  className={`z-10 flex h-3 w-3 items-center justify-center rounded-full ${dot}`}
                  title={mr ? STEP_LABEL[s].mr : STEP_LABEL[s].en}
                />
                <span
                  className={`mt-1 text-center text-[10px] leading-tight ${
                    reached
                      ? "font-medium text-zinc-700 dark:text-zinc-300"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {mr ? STEP_LABEL[s].mr : STEP_LABEL[s].en}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {order.status === "collected"
            ? mr
              ? "ऑर्डर पूर्ण — घेतली गेली"
              : "Order complete — collected"
            : mr
              ? `सध्या: ${STEP_LABEL[order.status].mr}…`
              : `Currently: ${STEP_LABEL[order.status].en}…`}
        </p>
        <button
          type="button"
          onClick={() => setShowTimes((v) => !v)}
          className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {showTimes
            ? mr
              ? "वेळ लपवा"
              : "Hide times"
            : mr
              ? "वेळ तपशील"
              : "View times"}
        </button>
      </div>

      {/* Expandable vertical timeline with per-step times */}
      {showTimes && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {STEPS.map((s, i) => {
            const reached = i <= current;
            const time = at.get(s);
            return (
              <li key={s} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      reached
                        ? i === current && s !== "collected"
                          ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-zinc-900"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                  >
                    {reached ? (i === current && s !== "collected" ? "●" : "✓") : "○"}
                  </span>
                  <span
                    className={
                      reached ? "font-medium text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"
                    }
                  >
                    {mr ? STEP_LABEL[s].mr : STEP_LABEL[s].en}
                    {i === current && s !== "collected" && (
                      <span className="ml-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                        {mr ? "(सध्या)" : "(now)"}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {reached ? (time ? fmtTime(time, locale) : mr ? "वेळ माहित नाही" : "time n/a") : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}