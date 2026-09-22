"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http/client";
import type { CustomerNotificationView } from "@/services/notificationService";

const TYPE_LABEL: Record<
  CustomerNotificationView["type"],
  { mr: string; en: string }
> = {
  orderReceived: { mr: "नवीन ऑर्डर", en: "New order" },
  orderProcessing: { mr: "दळण्यात", en: "Processing" },
  orderCompleted: { mr: "तयार", en: "Ready" },
  orderCollected: { mr: "घेतला", en: "Collected" },
  paymentReceived: { mr: "पेमेंट", en: "Payment" },
  paymentDue: { mr: "उधारी", en: "Due" },
  broadcast: { mr: "घोषणा", en: "Announcement" },
};

export function CustomerNotificationsPanel({
  notifications,
  lang,
}: {
  notifications: CustomerNotificationView[];
  lang: "mr" | "en";
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
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {mr ? "सूचना" : "Notifications"}
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {busy ? "…" : (mr ? "सर्व वाचले म्हणून चिन्हांकित करा" : "Mark all as read")}
          </button>
        )}
      </div>

      {error && (
        <p className="border-b border-zinc-200 px-4 py-2 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {mr ? "अजून कोणत्याही सूचना नाहीत." : "No notifications yet."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {notifications.map((n) => {
            const label = TYPE_LABEL[n.type] ?? { mr: "सूचना", en: "Notice" };
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-1.5 shrink-0">
                    {n.read ? (
                      <span className="block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-rose-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {mr ? label.mr : label.en}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(n.sentAt).toLocaleString(mr ? "mr-IN" : "en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 block text-sm ${
                        n.read
                          ? "text-zinc-500 dark:text-zinc-400"
                          : "font-medium text-zinc-900 dark:text-zinc-100"
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