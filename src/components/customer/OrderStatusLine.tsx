"use client";

import { ORDER_LIFECYCLE_STATUSES, type OrderStatus } from "@/lib/order-status";
import { t, type Lang } from "@/lib/i18n/dict";
import { IconCheck } from "@/components/common/Icons";

/** Dict key per lifecycle step, so the strip and the times list never disagree. */
const STEP_KEY: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "step.queued",
  processing: "step.milling",
  completed: "step.ready",
  collected: "step.collected",
};

/** Colour of the CURRENT step — the same family as its StatusBadge. */
const NOW_DOT: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "bg-haldi-500 ring-haldi-200 dark:ring-haldi-900",
  processing: "bg-neel-500 ring-neel-200 dark:ring-neel-900",
  completed: "bg-leaf-600 ring-leaf-200 dark:ring-leaf-900",
  collected: "bg-earth-600 ring-earth-200 dark:bg-earth-400 dark:ring-earth-800",
};
const NOW_TEXT: Record<(typeof ORDER_LIFECYCLE_STATUSES)[number], string> = {
  pending: "text-haldi-700 dark:text-haldi-300",
  processing: "text-neel-600 dark:text-neel-300",
  completed: "text-leaf-700 dark:text-leaf-300",
  collected: "text-earth-700 dark:text-earth-300",
};

/**
 * The order's journey: four stops on one track (रांगेत → दळण सुरू → तयार →
 * घेतले). Done stops get a tick, the current stop a coloured ring and a bold
 * word, the ones still ahead stay faint. Labels are 13px words under each
 * stop — readable on a 320px phone without decoding anything.
 *
 * A cancelled order has no journey, so it shows a single struck-through word.
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
      <p className="mt-3 text-sm font-bold text-earth-500 line-through dark:text-earth-400">
        {t("step.cancelled", lang)}
      </p>
    );
  }

  const current = ORDER_LIFECYCLE_STATUSES.indexOf(
    status as (typeof ORDER_LIFECYCLE_STATUSES)[number],
  );
  const last = ORDER_LIFECYCLE_STATUSES.length - 1;

  return (
    <ol className="mt-4 grid grid-cols-4" aria-label={t(STEP_KEY[ORDER_LIFECYCLE_STATUSES[current]], lang)}>
      {ORDER_LIFECYCLE_STATUSES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s} className="relative flex flex-col items-center text-center" aria-current={now ? "step" : undefined}>
            {/* track segments, drawn behind the dots */}
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[9px] h-0.5 w-full ${
                  i <= current ? "bg-earth-500 dark:bg-earth-400" : "bg-earth-200 dark:bg-earth-700"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${
                now
                  ? `${NOW_DOT[s]} ring-4`
                  : done
                    ? "bg-earth-600 text-white dark:bg-earth-400 dark:text-earth-950"
                    : "border-2 border-earth-300 bg-surface dark:border-earth-700"
              }`}
            >
              {done && <IconCheck className="h-3 w-3" strokeWidth={3} />}
              {now && i === last && <IconCheck className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            <span
              className={`mt-1.5 text-[13px] leading-tight ${
                now
                  ? `font-bold ${NOW_TEXT[s]}`
                  : done
                    ? "font-medium text-earth-600 dark:text-earth-300"
                    : "text-earth-400 dark:text-earth-500"
              }`}
            >
              {t(STEP_KEY[s], lang)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
