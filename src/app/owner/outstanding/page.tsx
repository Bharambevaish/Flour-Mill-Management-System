import Link from "next/link";
import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { listOrders } from "@/services/orderService";
import { PaymentsPanel, DueRemindersPanel } from "@/components/owner/payments";
import { getDuesByCustomer } from "@/services/reminderService";
import { getLang, formatLang } from "@/lib/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function OutstandingPage() {
  await connectDb();
  await requirePageSession("owner");
  const lang = await getLang();

  const [orders, dueRows] = await Promise.all([listOrders(), getDuesByCustomer()]);
  const dueOrders = orders.filter((o) => o.outstanding > 0);
  const dueTotal = dueOrders.reduce((s, o) => s + o.outstanding, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl leading-tight text-heading">
            {formatLang({ mr: "उधारी खाते", en: "Customer Outstanding Dues" }, lang)}
          </h1>
          <p className="text-sm text-earth-500 dark:text-earth-400">
            {formatLang(
              { mr: "ज्या ऑर्डरचे पैसे शिल्लक आहेत त्यांची सूची", en: "Orders with pending outstanding balances requiring settlement" },
              lang
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/owner/payments"
            className="stitch-btn-secondary text-sm"
          >
            {formatLang({ mr: "सर्व नोंदी पहा", en: "All Payments Ledger" }, lang)}
          </Link>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-surface px-5 py-3 text-right">
            <p className="text-xs font-medium text-earth-500 dark:text-earth-400">
              {formatLang({ mr: "एकूण उधारी", en: "Total Outstanding" }, lang)}
            </p>
            <p className="font-display text-2xl text-clay-700 dark:text-clay-400">₹ {dueTotal.toLocaleString("en-IN")}</p>
            <p className="text-xs text-earth-400 dark:text-earth-500">
              {dueOrders.length} {formatLang({ mr: "ऑर्डर बाकी", en: "orders pending" }, lang)}
            </p>
          </div>
        </div>
      </header>

      <DueRemindersPanel rows={dueRows} lang={lang} />

      <h2 className="mt-2 text-xl text-heading">{formatLang({ mr: "ऑर्डरनिहाय उधारी", en: "Dues by order" }, lang)}</h2>
      <PaymentsPanel orders={orders} duesOnly lang={lang} />
    </div>
  );
}