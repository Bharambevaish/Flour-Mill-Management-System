"use client";

import { ORDER_LIFECYCLE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import { t } from "@/lib/i18n/dict";
import type { OrderView } from "@/services/orderService";

const STEP_KEY: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "step.queued",
  processing: "step.milling",
  completed: "step.ready",
  collected: "step.collected",
};

/**
 * Per-step timestamps of the order's journey.
 *
 * These used to live behind a "View times" toggle directly under the progress
 * bar. That toggle was the main source of friction on the customer screen, so
 * the timestamps now render inside the order card's existing "Details"
 * expander — the same tap that already reveals the payment history. The data is
 * unchanged (`statusHistory`); only its placement moved.
 *
 * A step that was provably reached but has no stored time (rows created before
 * `statusHistory` existed) shows "time n/a" rather than a blank.
 */
export function OrderStatusTimes({ order, lang }: { order: OrderView; lang: Lang }) {
  const at = new Map<string, string>();
  for (const h of order.statusHistory) at.set(h.status, h.at);

  const cancelledAt = order.cancelledAt;
  const rows: { status: OrderStatus; label: string; at?: string }[] =
    ORDER_LIFECYCLE_STATUSES.map((s) => ({ status: s, label: t(STEP_KEY[s], lang), at: at.get(s) }));

  if (order.status === "cancelled") {
    rows.push({ status: "cancelled", label: t("step.cancelled", lang), at: cancelledAt });
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-earth-500 dark:text-earth-400">
        {t("step.times", lang)}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {rows.map((r) => {
          const reached = r.at !== undefined;
          const isCurrent = r.status === order.status;
          return (
            <li key={r.status} className="flex items-center justify-between gap-3 text-sm">
              <span
                className={
                  isCurrent
                    ? "font-bold text-earth-900 dark:text-earth-100"
                    : reached
                      ? "text-earth-700 dark:text-earth-300"
                      : "text-earth-400 dark:text-earth-600"
                }
              >
                {r.label}
                {isCurrent && (
                  <span className="ml-1.5 text-xs font-normal text-leaf-600 dark:text-leaf-400">
                    ({lang === "mr" ? "सध्या" : "now"})
                  </span>
                )}
              </span>
              <span className="text-xs text-earth-500 dark:text-earth-400">
                {r.at ? formatDateTime(r.at, lang) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
