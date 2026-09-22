import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { listOrders } from "@/services/orderService";
import { PaymentsPanel } from "@/components/owner/payments";
import { getLang, formatLang } from "@/lib/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string | string[] }>;
}) {
  await connectDb();
  await requirePageSession("owner");
  const lang = await getLang();
  const { customer } = await searchParams;
  const customerId = typeof customer === "string" ? customer : undefined;

  const orders = await listOrders();
  const dueTotal = orders.reduce((s, o) => s + o.outstanding, 0);
  const dueCount = orders.filter((o) => o.outstanding > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatLang({ mr: "पेमेंट नोंदी व पावती हब", en: "Payments & Receipts Hub" }, lang)}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatLang(
              { mr: "रोख व UPI पावती नोंदी — सर्व ऑर्डर व पैशांचा इतिहास", en: "Cash & UPI receipts and transaction history for all orders" },
              lang
            )}
          </p>
        </div>
        <div className="flex gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-right dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatLang({ mr: "उधारी असलेल्या ऑर्डर", en: "Orders with Dues" }, lang)}
            </p>
            <p className="font-bold text-zinc-900 dark:text-zinc-100">{dueCount}</p>
          </div>
          <div className="border-l border-zinc-200 pl-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatLang({ mr: "एकूण उधारी", en: "Total Due" }, lang)}
            </p>
            <p className="font-bold text-rose-700 dark:text-rose-400">
              ₹ {dueTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </header>

      <PaymentsPanel orders={orders} customerId={customerId} lang={lang} />
    </div>
  );
}