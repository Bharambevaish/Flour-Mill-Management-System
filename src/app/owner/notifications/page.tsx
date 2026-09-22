import Link from "next/link";

import { NotificationsComposer } from "@/components/owner/notifications";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { connectDb } from "@/lib/db";
import { formatLang, getLang } from "@/lib/i18n/i18n";
import { CustomerModel } from "@/models/Customer";
import { NotificationModel } from "@/models/Notification";
import { getSettingsOrDefault } from "@/services/settingsService";

export const dynamic = "force-dynamic";

interface RecentBroadcast {
  message: string;
  lang: "mr" | "en";
  sentAt: Date;
  count: number;
}

function formatAgo(d: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default async function NotificationsPage() {
  await requirePageSession("owner");
  const lang = await getLang();

  await connectDb();
  const [customerCount, settings, rows] = await Promise.all([
    CustomerModel.countDocuments({ active: true }),
    getSettingsOrDefault(),
    NotificationModel.find({ type: "broadcast", customerId: { $ne: null } })
      .sort({ sentAt: -1 })
      .limit(300)
      .lean(),
  ]);

  // Group the fan-out rows back into "one send" per message+language.
  const recent: RecentBroadcast[] = [];
  for (const r of rows) {
    const found = recent.find((x) => x.message === r.message && x.lang === r.lang);
    if (found) found.count += 1;
    else recent.push({ message: r.message, lang: r.lang, sentAt: r.sentAt, count: 1 });
  }
  const recentTop = recent.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatLang({ mr: "सूचना", en: "Notifications" }, lang)}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatLang(
            {
              mr: "ग्राहकांना एकाच वेळी सूचना पाठवा (इन-ॲप). प्रत्येक ग्राहकाला त्याच्या डॅशबोर्डवर दिसेल.",
              en: "Send an in-app announcement to all active customers at once.",
            },
            lang,
          )}
        </p>
      </header>

      <NotificationsComposer
        customerCount={customerCount}
        inAppEnabled={settings.notifications.inApp}
        initialLang={lang}
      />

      {recentTop.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatLang({ mr: "नुकत्याच पाठवलेल्या सूचना", en: "Recent broadcasts" }, lang)}
            </h2>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentTop.map((r, i) => (
              <li key={`${r.lang}-${r.sentAt.getTime()}-${i}`} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.message}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatLang({ mr: "ग्राहक", en: "customers" }, lang)}: {r.count} · {r.lang === "mr" ? "मराठी" : "English"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{formatAgo(r.sentAt)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <Link href="/owner/outstanding" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
              {formatLang({ mr: "उधारी विभाग पहा →", en: "View outstanding →" }, lang)}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}