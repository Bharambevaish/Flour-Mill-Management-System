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
  const [customerCount, settings, rows, activeCustomers] = await Promise.all([
    CustomerModel.countDocuments({ active: true }),
    getSettingsOrDefault(),
    NotificationModel.find({ type: "broadcast", customerId: { $ne: null } })
      .sort({ sentAt: -1 })
      .limit(300)
      .lean(),
    CustomerModel.find({ active: true }).select("name mobile").sort({ name: 1 }).lean(),
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
        <h1 className="text-2xl font-bold tracking-tight text-earth-900 dark:text-earth-100 font-display">
          {formatLang({ mr: "सूचना", en: "Notifications" }, lang)}
        </h1>
        <p className="text-sm text-earth-500 dark:text-earth-400">
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
        customers={activeCustomers.map((c) => ({
          id: String(c._id),
          name: c.name,
          mobile: c.mobile,
        }))}
        inAppEnabled={settings.notifications.inApp}
        initialLang={lang}
      />

      {recentTop.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white shadow-soft dark:border-earth-800 dark:bg-earth-900">
          <div className="border-b border-clay-50 px-6 py-4 dark:border-earth-800">
            <h2 className="text-base font-bold text-earth-900 dark:text-earth-100 font-display">
              {formatLang({ mr: "नुकत्याच पाठवलेल्या सूचना", en: "Recent broadcasts" }, lang)}
            </h2>
          </div>
          <ul className="divide-y divide-clay-50 dark:divide-earth-800">
            {recentTop.map((r, i) => (
              <li key={`${r.lang}-${r.sentAt.getTime()}-${i}`} className="flex items-start justify-between gap-4 px-6 py-3.5 hover:bg-clay-50/20 dark:hover:bg-earth-800/40 transition-colors">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-earth-900 dark:text-earth-100">{r.message}</p>
                  <p className="text-xs text-earth-500 dark:text-earth-400">
                    {formatLang({ mr: "ग्राहक", en: "customers" }, lang)}: {r.count} · {r.lang === "mr" ? "मराठी" : "English"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-earth-400">{formatAgo(r.sentAt)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-clay-50 px-6 py-3.5 dark:border-earth-800">
            <Link href="/owner/outstanding" className="text-sm font-semibold text-clay-700 hover:text-clay-800 dark:text-clay-400 dark:hover:text-clay-300">
              {formatLang({ mr: "उधारी विभाग पहा →", en: "View outstanding →" }, lang)}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}