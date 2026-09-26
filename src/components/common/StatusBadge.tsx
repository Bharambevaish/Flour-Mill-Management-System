import type { OrderStatus } from "@/models/Order";
import type { Lang } from "@/lib/i18n/i18n";

export const STATUS_BADGE: Record<OrderStatus, { mr: string; en: string; cls: string }> = {
  pending: {
    mr: "प्रलंबित",
    en: "Pending",
    cls: "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  processing: {
    mr: "दळण्यात",
    en: "Processing",
    cls: "bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  },
  completed: {
    mr: "तयार",
    en: "Ready",
    cls: "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  collected: {
    mr: "घेतला",
    en: "Collected",
    cls: "bg-rose-50/70 text-rose-800 border border-rose-200/70 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-700",
  },
};

export function StatusBadge({ status, lang = "en" }: { status: OrderStatus; lang?: Lang }) {
  const b = STATUS_BADGE[status];
  const label = lang === "mr" ? b.mr : b.en;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs ${b.cls}`}>
      {label}
    </span>
  );
}