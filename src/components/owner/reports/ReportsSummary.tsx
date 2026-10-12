import Link from "next/link";
import { grainLabel } from "@/lib/millings";
import { formatDateTimeFull, type Lang } from "@/lib/i18n/i18n";
import type { ReportSummary } from "@/services/reportService";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

function fmtDate(iso: string, lang: Lang): string {
  return formatDateTimeFull(iso, lang);
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-soft dark:border-earth-800 dark:bg-earth-900">
      <p className="text-xs font-semibold text-earth-500 dark:text-earth-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold font-display ${accent ?? "text-earth-900 dark:text-earth-100"}`}>{value}</p>
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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-soft dark:border-earth-800 dark:bg-earth-900">
      <h2 className="mb-4 text-base font-bold text-earth-900 dark:text-earth-100 font-display">{title}</h2>
      {children}
    </section>
  );
}

const TH = "px-4 py-2.5 text-left text-xs font-semibold text-earth-500 dark:text-earth-400 uppercase tracking-wider";
const TD = "px-4 py-3 text-sm text-earth-800 dark:text-earth-200";

export function ReportsSummary({ report, lang }: { report: ReportSummary; lang: Lang }) {
  const mr = lang === "mr";
  const { activity, byGrain, byMethod, customers, receipts, upiReceipts, range } = report;
  // Only add the refund column when someone actually has money held against a
  // cancelled order — an always-present all-zero column reads as noise.
  const hasRefunds = customers.some((c) => c.refundPending > 0);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-earth-500 dark:text-earth-400">
        {fmtDate(range.from, lang)} — {fmtDate(range.to, lang)}
      </p>

      {/* Activity KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={mr ? "ऑर्डर तयार" : "Orders created"} value={activity.ordersCreated.toLocaleString("en-IN")} />
        <Kpi label={mr ? "एकूण वजन" : "Total weight"} value={`${activity.weightKg.toLocaleString("en-IN")} kg`} />
        <Kpi label={mr ? "एकूण आकारणी" : "Total charges"} value={money(activity.totalCharges)} />
        <Kpi label={mr ? "वसूल" : "Collected"} value={money(activity.collected)} accent="text-leaf-700 dark:text-leaf-400" />
        <Kpi label={mr ? "नवीन ऑर्डर उधारी" : "Dues on new orders"} value={money(activity.outstandingOnNewOrders)} accent="text-clay-700 dark:text-clay-400" />
      </div>

      {/* Cash vs UPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi label={mr ? "रोख वसूल" : "Cash collected"} value={money(byMethod.cash)} />
        <Kpi label={mr ? "UPI वसूल" : "UPI collected"} value={money(byMethod.upi)} />
      </div>

      {/* Grain breakdown */}
      <SectionCard title={mr ? "धान्यानुसार" : "Grain-wise breakdown"}>
        {byGrain.length === 0 ? (
          <p className="text-sm text-earth-500 dark:text-earth-400">{mr ? "या कालावधीत ऑर्डर नाहीत." : "No orders in this period."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem]">
              <thead>
                <tr className="border-b border-earth-200 dark:border-earth-800">
                  <th className={TH}>{mr ? "धान्य" : "Grain"}</th>
                  <th className={TH}>{mr ? "ऑर्डर" : "Orders"}</th>
                  <th className={TH}>{mr ? "वजन (किलो)" : "Weight (kg)"}</th>
                  <th className={TH}>{mr ? "आकारणी" : "Charges"}</th>
                </tr>
              </thead>
              <tbody>
                {byGrain.map((g) => (
                  <tr key={g.grainType} className="border-b border-earth-100 last:border-0 dark:border-earth-800/60">
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
          <p className="text-sm text-earth-500 dark:text-earth-400">{mr ? "कोणतेही ग्राहक नाहीत." : "No customers."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr className="border-b border-earth-200 dark:border-earth-800">
                  <th className={TH}>{mr ? "ग्राहक" : "Customer"}</th>
                  <th className={TH}>{mr ? "ऑर्डर" : "Orders"}</th>
                  <th className={TH}>{mr ? "आकारणी" : "Charges"}</th>
                  <th className={TH}>{mr ? "वसूल" : "Paid"}</th>
                  <th className={TH}>{mr ? "उधारी" : "Outstanding"}</th>
                  <th className={TH}>{mr ? "या कालावधीत वसूल" : "Collected in period"}</th>
                  {hasRefunds && <th className={TH}>{mr ? "परत द्यायची रक्कम" : "Refund due"}</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-earth-100 last:border-0 dark:border-earth-800/60">
                    <td className={TD}>
                      {c.outstanding > 0 ? (
                        <Link href={`/owner/payments?customer=${c.id}`} className="font-medium text-haldi-700 hover:underline dark:text-haldi-400">
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                      <span className="ml-1 text-xs text-earth-400">{c.mobile}</span>
                    </td>
                    <td className={TD}>{c.orders.toLocaleString("en-IN")}</td>
                    <td className={TD}>{money(c.totalCharges)}</td>
                    <td className={TD}>{money(c.paid)}</td>
                    <td className={`${TD} ${c.outstanding > 0 ? "font-semibold text-clay-700 dark:text-clay-400" : "text-leaf-700 dark:text-leaf-400"}`}>
                      {money(c.outstanding)}
                    </td>
                    <td className={TD}>{money(c.collectedInPeriod)}</td>
                    {hasRefunds && (
                      <td className={`${TD} ${c.refundPending > 0 ? "font-semibold text-haldi-700 dark:text-haldi-400" : "text-earth-400"}`}>
                        {money(c.refundPending)}
                      </td>
                    )}
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
          <p className="text-sm font-medium text-earth-500 dark:text-earth-400">{mr ? "या कालावधीत कोणतीही वसूल नोंद नाही." : "No receipts in this period."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-clay-50 dark:divide-earth-800/60">
            {receipts.map((r) => (
              <li key={`${r.orderId}-${r.recordedAt}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Link href={`/print/receipt/${r.orderId}`} target="_blank" className="rounded-full border border-clay-100 bg-clay-50 px-2.5 py-0.5 text-xs font-semibold text-clay-800 hover:bg-clay-100 dark:bg-earth-800 dark:border-earth-700 dark:text-earth-300 dark:hover:bg-earth-700 transition-colors">
                    #{r.orderId}
                  </Link>
                  <span className="truncate text-sm font-medium text-earth-800 dark:text-earth-200">
                    {r.customer}
                    {r.upiTxnId && <span className="ml-1 text-xs text-earth-400">· {r.upiTxnId}</span>}
                  </span>
                </span>
                <span className="text-sm">
                  <span className={r.method === "upi" ? "font-semibold text-neel-700 dark:text-neel-400" : "font-semibold text-leaf-700 dark:text-leaf-400"}>
                    {r.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                  </span>
                  <span className="ml-2 font-bold text-earth-900 dark:text-earth-100">{money(r.amount)}</span>
                  <span className="ml-2 text-xs text-earth-400">{fmtDate(r.recordedAt, lang)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {upiReceipts.length > 0 && (
        <SectionCard title={mr ? "UPI व्यवहार" : "UPI transactions"}>
          <ul className="flex flex-col divide-y divide-clay-50 dark:divide-earth-800">
            {upiReceipts.map((u) => (
              <li key={`${u.orderId}-${u.recordedAt}`} className="flex items-center justify-between py-2 text-sm text-earth-700 dark:text-earth-300">
                <span className="font-medium">#{u.orderId} · {u.upiTxnId ?? "—"}</span>
                <span className="font-bold text-earth-900 dark:text-earth-100">{money(u.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
