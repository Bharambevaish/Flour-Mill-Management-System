"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http/client";
import { formatDateTime } from "@/lib/i18n/format";
import { t, type Lang } from "@/lib/i18n/dict";
import type { CustomerNotificationView } from "@/services/notificationService";

const TYPE_LABEL: Record<
  CustomerNotificationView["type"],
  { mr: string; en: string }
> = {
  orderReceived: { mr: "नवीन ऑर्डर", en: "New order" },
  orderProcessing: { mr: "दळण्यात", en: "Processing" },
  orderCompleted: { mr: "तयार", en: "Ready" },
  orderCollected: { mr: "घेतला", en: "Collected" },
  orderCancelled: { mr: "रद्द", en: "Cancelled" },
  paymentReceived: { mr: "पेमेंट", en: "Payment" },
  paymentDue: { mr: "उधारी", en: "Due" },
  broadcast: { mr: "घोषणा", en: "Announcement" },
};

/** Text colour per type, matching the order-status palette. */
const TYPE_TONE: Partial<Record<CustomerNotificationView["type"], string>> = {
  orderReceived: "text-haldi-700 dark:text-haldi-300",
  orderProcessing: "text-neel-600 dark:text-neel-300",
  orderCompleted: "text-leaf-700 dark:text-leaf-300",
  orderCollected: "text-earth-600 dark:text-earth-300",
  orderCancelled: "text-earth-500 dark:text-earth-400",
  paymentReceived: "text-leaf-700 dark:text-leaf-300",
  paymentDue: "text-clay-700 dark:text-clay-400",
  broadcast: "text-clay-700 dark:text-clay-400",
};

/** The inbox opens on the newest few; the rest sit behind "Show all". */
const PREVIEW_COUNT = 5;

export function CustomerNotificationsPanel({
  notifications,
  lang,
}: {
  notifications: CustomerNotificationView[];
  lang: Lang;
}) {
  const router = useRouter();
  const mr = lang === "mr";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setError(null);
    const res = await apiFetch(`/api/my/notifications/${id}/read`, { method: "PATCH" });
    if (!res.ok) {
      setError(res.error?.message ?? (mr ? "पुन्हा प्रयत्न करा" : "Try again"));
      return;
    }
    router.refresh();
  }

  async function markAll() {
    setBusy(true);
    setError(null);
    const res = await apiFetch("/api/my/notifications/read-all", { method: "PATCH" });
    setBusy(false);
    if (!res.ok) {
      setError(res.error?.message ?? (mr ? "पुन्हा प्रयत्न करा" : "Try again"));
      return;
    }
    router.refresh();
  }

  const shown = showAll ? notifications : notifications.slice(0, PREVIEW_COUNT);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl text-heading">{t("cust.notifications", lang)}</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-clay-600 px-2 py-0.5 text-xs font-bold text-white">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy}
            className="min-h-9 text-sm font-semibold text-clay-700 hover:text-clay-800 disabled:opacity-50 dark:text-clay-400"
          >
            {busy ? "…" : t("cust.markAllRead", lang)}
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">{error}</p>}

      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-5 py-8 text-center text-sm text-muted">
          {t("cust.notificationsEmpty", lang)}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {shown.map((n) => {
              const label = TYPE_LABEL[n.type] ?? { mr: "सूचना", en: "Notice" };
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-earth-100/60 dark:hover:bg-earth-800/40"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-clay-600 dark:bg-clay-400"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className={`text-xs font-bold ${TYPE_TONE[n.type] ?? "text-muted"}`}>{mr ? label.mr : label.en}</span>
                        <span className="text-xs text-earth-500 dark:text-earth-400">{formatDateTime(n.sentAt, lang)}</span>
                      </span>
                      <span
                        className={`mt-0.5 block text-[15px] leading-snug ${
                          n.read ? "text-earth-600 dark:text-earth-400" : "font-semibold text-heading"
                        }`}
                      >
                        {n.message}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {notifications.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-[var(--border-subtle)] text-sm font-semibold text-clay-700 hover:bg-earth-100/60 dark:text-clay-400 dark:hover:bg-earth-800/40"
            >
              {showAll ? t("cust.showLess", lang) : `${t("cust.showAll", lang)} (${notifications.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
