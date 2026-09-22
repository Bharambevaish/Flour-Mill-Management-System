import type { OrderStatus } from "@/models/Order";
import type { Lang } from "@/lib/i18n/i18n";

export const STATUS_BADGE: Record<OrderStatus, { mr: string; en: string; cls: string }> = {
  pending: { mr: "प्रलंबित", en: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  processing: { mr: "दळण्यात", en: "Processing", cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  completed: { mr: "तयार", en: "Ready", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  collected: { mr: "घेतला", en: "Collected", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300" },
};

export function StatusBadge({ status, lang = "en" }: { status: OrderStatus; lang?: Lang }) {
  const b = STATUS_BADGE[status];
  const label = lang === "mr" ? b.mr : b.en;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>
      {label}
    </span>
  );
}