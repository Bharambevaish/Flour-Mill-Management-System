import Link from "next/link";
import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { listOrders } from "@/services/orderService";
import { PaymentsPanel } from "@/components/owner/payments";
import { getLang, formatLang } from "@/lib/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function OutstandingPage() {
  await connectDb();
  await requirePageSession("owner");
  const lang = await getLang();

  const orders = await listOrders();
  const dueOrders = orders.filter((o) => o.outstanding > 0);
  const dueTotal = dueOrders.reduce((s, o) => s + o.outstanding, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatLang({ mr: "उधारी खाते", en: "Customer Outstanding Dues" }, lang)}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatLang(
              { mr: "ज्या ऑर्डरचे पैसे शिल्लक आहेत त्यांची सूची", en: "Orders with pending outstanding balances requiring settlement" },
              lang
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/owner/payments"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {formatLang({ mr: "सर्व नोंदी पहा", en: "All Payments Ledger" }, lang)}
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-right dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatLang({ mr: "एकूण उधारी", en: "Total Outstanding" }, lang)}
            </p>
            <p className="font-bold text-rose-700 dark:text-rose-400">₹ {dueTotal.toLocaleString("en-IN")}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {dueOrders.length} {formatLang({ mr: "ऑर्डर बाकी", en: "orders pending" }, lang)}
            </p>
          </div>
        </div>
      </header>

      <PaymentsPanel orders={orders} duesOnly lang={lang} />
    </div>
  );
}