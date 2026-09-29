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

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-50 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
            {t("cust.notifications", lang)}
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy}
            className="stitch-btn-secondary text-xs"
          >
            {busy ? "…" : t("cust.markAllRead", lang)}
          </button>
        )}
      </div>

      {error && (
        <p className="border-b border-rose-100 px-5 py-2.5 text-sm font-medium text-rose-600 dark:border-zinc-800 dark:text-rose-400">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {t("cust.notificationsEmpty", lang)}
        </p>
      ) : (
        <ul className="divide-y divide-rose-50 dark:divide-zinc-800">
          {notifications.map((n) => {
            const label = TYPE_LABEL[n.type] ?? { mr: "सूचना", en: "Notice" };
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-rose-50/20 dark:hover:bg-zinc-800/40 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-1.5 shrink-0">
                    {n.read ? (
                      <span className="block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-rose-600" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/30">
                        {mr ? label.mr : label.en}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatDateTime(n.sentAt, lang)}
                      </span>
                    </span>
                    <span
                      className={`mt-1 block text-sm ${
                        n.read
                          ? "text-zinc-500 dark:text-zinc-400"
                          : "font-semibold text-zinc-900 dark:text-zinc-100"
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
      )}
    </section>
  );
}