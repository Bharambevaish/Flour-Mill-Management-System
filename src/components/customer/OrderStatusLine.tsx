"use client";

import { ORDER_LIFECYCLE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { t, type Lang } from "@/lib/i18n/dict";

/** Dict key per lifecycle step, so the strip and the times list never disagree. */
const STEP_KEY: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "step.queued",
  processing: "step.milling",
  completed: "step.ready",
  collected: "step.collected",
};

/** Text colour per step — the bright end of each STATUS_BADGE palette. */
const STEP_TEXT: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "text-amber-700 dark:text-amber-400",
  processing: "text-sky-700 dark:text-sky-400",
  completed: "text-emerald-700 dark:text-emerald-400",
  collected: "text-rose-700 dark:text-rose-400",
};

/**
 * The order's journey as ONE line of plain words (रांगेत · दळण सुरू · तयार ·
 * घेतले) with the current step highlighted in its own colour.
 *
 * This replaced a 4-dot progress bar with `text-[10px]` labels and a separate
 * "Currently: …" caption. Four tiny dots under a hairline track is a desktop
 * idiom that reads as clutter on a phone and is hard to interpret for someone
 * who has never used the app before; four readable words in a row answer
 * "where is my order?" without needing the track decoded.
 *
 * Deliberately NOT `whitespace-nowrap`: at 320 px the line wraps to two rows
 * rather than being clipped.
 *
 * A cancelled order has no journey, so it shows a single word instead.
 */
export function OrderStatusLine({
  status,
  lang,
}: {
  status: OrderStatus;
  lang: Lang;
}) {
  if (status === "cancelled") {
    return (
      <p className="mt-2.5 text-sm font-bold text-zinc-500 line-through dark:text-zinc-400">
        {t("step.cancelled", lang)}
      </p>
    );
  }

  const current = ORDER_LIFECYCLE_STATUSES.indexOf(
    status as (typeof ORDER_LIFECYCLE_STATUSES)[number],
  );

  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
      {ORDER_LIFECYCLE_STATUSES.map((s, i) => {
        const isCurrent = i === current;
        const isPast = i < current;
        return (
          <span key={s} className="inline-flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                ·
              </span>
            )}
            <span
              className={
                isCurrent
                  ? `font-bold ${STEP_TEXT[s]}`
                  : isPast
                    ? "font-medium text-zinc-500 dark:text-zinc-400"
                    : "font-normal text-zinc-400/70 dark:text-zinc-600"
              }
            >
              {t(STEP_KEY[s], lang)}
            </span>
          </span>
        );
      })}
    </p>
  );
}
