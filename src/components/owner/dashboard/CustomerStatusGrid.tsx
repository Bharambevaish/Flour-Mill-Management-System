import Link from "next/link";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { StatusBadge } from "@/components/common";
import type { CustomerView } from "@/services/customerService";
import type { OrderView } from "@/services/orderService";
import type { Lang } from "@/lib/i18n/i18n";

export interface CustomerStatusRow {
  customer: CustomerView;
  orderCount: number;
  totalCharges: number;
  paidAmount: number;
  outstanding: number;
  /** Cash received on cancelled orders that still has to be handed back. */
  refundDue: number;
  activeOrder: OrderView | null;
}

function timeAgo(iso: string, lang: Lang = "en"): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return lang === "mr" ? "आत्ताच" : "just now";
  if (mins < 60) return lang === "mr" ? `${mins} मिनिटांपूर्वी` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "mr" ? `${hrs} तासांपूर्वी` : `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return lang === "mr" ? `${days} दिवसांपूर्वी` : `${days} days ago`;
}

export function CustomerStatusGrid({
  customers,
  showAttentionOnly = false,
  lang = "en",
}: {
  customers: CustomerStatusRow[];
  showAttentionOnly?: boolean;
  lang?: Lang;
}) {
  const rows = customers.filter(
    (r) => !showAttentionOnly || r.outstanding > 0 || r.refundDue > 0 || r.activeOrder !== null,
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-rose-200/80 bg-white/60 p-8 text-center text-sm font-medium text-[#7d5e67] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {lang === "mr"
          ? "कोणतीही प्रलंबित ऑर्डर किंवा उधारी नाही. सर्व ग्राहक सेटल आहेत."
          : "No active orders or dues — everyone is settled."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {rows.map(({ customer, orderCount, totalCharges, paidAmount, outstanding, refundDue, activeOrder }) => (
        <section
          key={customer.id}
          className="stitch-card p-5"
        >
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <Link
                href="/owner/customers"
                className="truncate font-bold text-gray-900 hover:text-rose-700 dark:text-zinc-100 dark:hover:text-rose-400"
                title={customer.name}
              >
                {customer.name}
              </Link>
              <p className="text-xs font-medium text-[#7d5e67] dark:text-zinc-400">{customer.mobile}</p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {outstanding > 0 ? (
                <Link
                  href={`/owner/payments?customer=${customer.id}`}
                  className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 shadow-xs transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                >
                  {lang === "mr"
                    ? `उधारी ₹ ${outstanding.toLocaleString("en-IN")} →`
                    : `Due ₹ ${outstanding.toLocaleString("en-IN")} →`}
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {lang === "mr" ? "पैसे पूर्ण" : "Fully Paid"}
                </span>
              )}
              {/* Zero dues plus a pending refund looks "Fully Paid" above, which is
                  the opposite of the truth — the mill is holding their money. */}
              {refundDue > 0 && (
                <Link
                  href="/owner/queue"
                  className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-xs hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                >
                  {lang === "mr"
                    ? `परत द्यायचे ₹ ${refundDue.toLocaleString("en-IN")} →`
                    : `Refund due ₹ ${refundDue.toLocaleString("en-IN")} →`}
                </Link>
              )}
              <span className="text-xs text-[#7d5e67] dark:text-zinc-500">
                {lang === "mr"
                  ? `${orderCount} ऑर्डर · वसूल ₹ ${paidAmount.toLocaleString("en-IN")} / एकूण ₹ ${totalCharges.toLocaleString("en-IN")}`
                  : `${orderCount} order${orderCount === 1 ? "" : "s"} · Paid ₹ ${paidAmount.toLocaleString("en-IN")} / Total ₹ ${totalCharges.toLocaleString("en-IN")}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[#f6dbe2] pt-3 dark:border-zinc-800">
            {activeOrder ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
                    #{activeOrder.orderId} · {grainLabel(activeOrder.grainType, lang)} ·{" "}
                    {sizeLabel(activeOrder.requiredSize, lang)} · {activeOrder.weightKg} kg
                  </p>
                  <StatusBadge status={activeOrder.status} lang={lang} />
                </div>
                <p className="text-xs font-medium text-[#7d5e67] dark:text-zinc-400">
                  ₹ {activeOrder.ratePerKg}/kg · {lang === "mr" ? "किंमत" : "Total"} ₹ {activeOrder.totalCharges.toLocaleString("en-IN")} ·{" "}
                  {timeAgo(activeOrder.createdAt, lang)}
                </p>
              </>
            ) : (
              <p className="text-xs font-medium text-[#7d5e67] dark:text-zinc-400">
                {lang === "mr" ? "सध्या कोणतीही सक्रिय ऑर्डर नाही" : "No active order right now"}
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}