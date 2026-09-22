import Link from "next/link";
import { grainLabel } from "@/lib/millings";
import type { Lang } from "@/lib/i18n/i18n";
import type { ReportSummary } from "@/services/reportService";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ?? "text-zinc-900 dark:text-zinc-100"}`}>{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}

const TH = "px-3 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400";
const TD = "px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200";

export function ReportsSummary({ report, lang }: { report: ReportSummary; lang: Lang }) {
  const mr = lang === "mr";
  const { activity, byGrain, byMethod, customers, receipts, upiReceipts, range } = report;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {fmtDate(range.from, lang)} — {fmtDate(range.to, lang)}
      </p>

      {/* Activity KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={mr ? "ऑर्डर तयार" : "Orders created"} value={activity.ordersCreated.toLocaleString("en-IN")} />
        <Kpi label={mr ? "एकूण वजन" : "Total weight"} value={`${activity.weightKg.toLocaleString("en-IN")} kg`} />
        <Kpi label={mr ? "एकूण आकारणी" : "Total charges"} value={money(activity.totalCharges)} />
        <Kpi label={mr ? "वसूल" : "Collected"} value={money(activity.collected)} accent="text-emerald-700 dark:text-emerald-400" />
        <Kpi label={mr ? "नवीन ऑर्डर उधारी" : "Dues on new orders"} value={money(activity.outstandingOnNewOrders)} accent="text-rose-700 dark:text-rose-400" />
      </div>

      {/* Cash vs UPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi label={mr ? "रोख वसूल" : "Cash collected"} value={money(byMethod.cash)} />
        <Kpi label={mr ? "UPI वसूल" : "UPI collected"} value={money(byMethod.upi)} />
      </div>

      {/* Grain breakdown */}
      <SectionCard title={mr ? "धान्यानुसार" : "Grain-wise breakdown"}>
        {byGrain.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{mr ? "या कालावधीत ऑर्डर नाहीत." : "No orders in this period."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className={TH}>{mr ? "धान्य" : "Grain"}</th>
                  <th className={TH}>{mr ? "ऑर्डर" : "Orders"}</th>
                  <th className={TH}>{mr ? "वजन (किलो)" : "Weight (kg)"}</th>
                  <th className={TH}>{mr ? "आकारणी" : "Charges"}</th>
                </tr>
              </thead>
              <tbody>
                {byGrain.map((g) => (
                  <tr key={g.grainType} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className={TD}>{grainLabel(g.grainType, lang)}</td>
                    <td className={TD}>{g.orders.toLocaleString("en-IN")}</td>
                    <td className={TD}>{g.weightKg.toLocaleString("en-IN")}</td>
                    <td className={TD}>{money(g.totalCharges)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Customer dues ledger (current snapshot) */}
      <SectionCard title={mr ? "ग्राहक उधारी खाते (चालू स्थिती)" : "Customer dues ledger (current snapshot)"}>
        {customers.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{mr ? "कोणतेही ग्राहक नाहीत." : "No customers."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className={TH}>{mr ? "ग्राहक" : "Customer"}</th>
                  <th className={TH}>{mr ? "ऑर्डर" : "Orders"}</th>
                  <th className={TH}>{mr ? "आकारणी" : "Charges"}</th>
                  <th className={TH}>{mr ? "वसूल" : "Paid"}</th>
                  <th className={TH}>{mr ? "उधारी" : "Outstanding"}</th>
                  <th className={TH}>{mr ? "या कालावधीत वसूल" : "Collected in period"}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className={TD}>
                      {c.outstanding > 0 ? (
                        <Link href={`/owner/payments?customer=${c.id}`} className="font-medium text-amber-700 hover:underline dark:text-amber-400">
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                      <span className="ml-1 text-xs text-zinc-400">{c.mobile}</span>
                    </td>
                    <td className={TD}>{c.orders.toLocaleString("en-IN")}</td>
                    <td className={TD}>{money(c.totalCharges)}</td>
                    <td className={TD}>{money(c.paid)}</td>
                    <td className={`${TD} ${c.outstanding > 0 ? "font-semibold text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {money(c.outstanding)}
                    </td>
                    <td className={TD}>{money(c.collectedInPeriod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Receipts in period */}
      <SectionCard title={mr ? `पावती नोंदी (${receipts.length})` : `Receipts in period (${receipts.length})`}>
        {receipts.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{mr ? "या कालावधीत कोणतीही वसूल नोंद नाही." : "No receipts in this period."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {receipts.map((r) => (
              <li key={`${r.orderId}-${r.recordedAt}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Link href={`/print/receipt/${r.orderId}`} target="_blank" className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                    #{r.orderId}
                  </Link>
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {r.customer}
                    {r.upiTxnId && <span className="ml-1 text-xs text-zinc-400">· {r.upiTxnId}</span>}
                  </span>
                </span>
                <span className="text-sm">
                  <span className={r.method === "upi" ? "text-sky-700 dark:text-sky-400" : "text-emerald-700 dark:text-emerald-400"}>
                    {r.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                  </span>
                  <span className="ml-2 font-semibold text-zinc-900 dark:text-zinc-100">{money(r.amount)}</span>
                  <span className="ml-2 text-xs text-zinc-400">{fmtDate(r.recordedAt, lang)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {upiReceipts.length > 0 && (
        <SectionCard title={mr ? "UPI व्यवहार" : "UPI transactions"}>
          <ul className="flex flex-col gap-1">
            {upiReceipts.map((u) => (
              <li key={`${u.orderId}-${u.recordedAt}`} className="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300">
                <span>#{u.orderId} · {u.upiTxnId ?? "—"}</span>
                <span className="font-medium">{money(u.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
