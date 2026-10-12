import type { OrderStatus } from "@/models/Order";
import type { Lang } from "@/lib/i18n/i18n";

/**
 * Badge palette for every order status.
 *
 * The first four are the forward lifecycle; `cancelled` is deliberately a muted
 * slate rather than a red so a voided order reads as "set aside" instead of
 * "something went wrong" — the customer should not be alarmed by a status pill.
 */
export const STATUS_BADGE: Record<OrderStatus, { mr: string; en: string; cls: string }> = {
  pending: {
    mr: "प्रलंबित",
    en: "Pending",
    cls: "bg-haldi-50 text-haldi-800 border border-haldi-200/80 dark:bg-haldi-500/15 dark:text-haldi-300 dark:border-haldi-500/30",
  },
  processing: {
    mr: "दळण्यात",
    en: "Processing",
    cls: "bg-neel-50 text-neel-800 border border-neel-200/80 dark:bg-neel-500/15 dark:text-neel-300 dark:border-neel-500/30",
  },
  completed: {
    mr: "तयार",
    en: "Ready",
    cls: "bg-leaf-50 text-leaf-800 border border-leaf-200/80 dark:bg-leaf-500/15 dark:text-leaf-300 dark:border-leaf-500/30",
  },
  collected: {
    mr: "घेतला",
    en: "Collected",
    cls: "bg-earth-100 text-earth-700 border border-earth-300/80 dark:bg-earth-500/15 dark:text-earth-300 dark:border-earth-700",
  },
  cancelled: {
    mr: "रद्द",
    en: "Cancelled",
    cls: "bg-earth-100 text-earth-600 border border-earth-300/80 line-through dark:bg-earth-800/60 dark:text-earth-400 dark:border-earth-700",
  },
};

export function StatusBadge({ status, lang = "en" }: { status: OrderStatus; lang?: Lang }) {
  const b = STATUS_BADGE[status];
  const label = lang === "mr" ? b.mr : b.en;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>
      {label}
    </span>
  );
}
