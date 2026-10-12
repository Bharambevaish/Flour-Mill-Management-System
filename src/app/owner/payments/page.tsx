import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { listOrders } from "@/services/orderService";
import { listPendingPaymentClaims } from "@/services/paymentClaimService";
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

  const [orders, pendingClaims] = await Promise.all([
    listOrders(),
    listPendingPaymentClaims(),
  ]);
  const dueTotal = orders.reduce((s, o) => s + o.outstanding, 0);
  const dueCount = orders.filter((o) => o.outstanding > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-earth-900 dark:text-earth-100 font-display">
            {formatLang({ mr: "पेमेंट नोंदी व पावती हब", en: "Payments & Receipts Hub" }, lang)}
          </h1>
          <p className="text-sm text-earth-500 dark:text-earth-400">
            {formatLang(
              { mr: "रोख व UPI पावती नोंदी — सर्व ऑर्डर व पैशांचा इतिहास", en: "Cash & UPI receipts and transaction history for all orders" },
              lang
            )}
          </p>
        </div>
        <div className="flex gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white px-5 py-3 shadow-soft text-right dark:border-earth-800 dark:bg-earth-900">
          <div>
            <p className="text-xs font-medium text-earth-500 dark:text-earth-400">
              {formatLang({ mr: "उधारी असलेल्या ऑर्डर", en: "Orders with Dues" }, lang)}
            </p>
            <p className="text-lg font-bold text-earth-900 dark:text-earth-100">{dueCount}</p>
          </div>
          <div className="border-l border-clay-100 pl-4 dark:border-earth-800">
            <p className="text-xs font-medium text-earth-500 dark:text-earth-400">
              {formatLang({ mr: "एकूण उधारी", en: "Total Due" }, lang)}
            </p>
            <p className="text-lg font-bold text-clay-700 dark:text-clay-400">
              ₹ {dueTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </header>

      <PaymentsPanel
        orders={orders}
        customerId={customerId}
        lang={lang}
        pendingClaims={pendingClaims}
      />
    </div>
  );
}