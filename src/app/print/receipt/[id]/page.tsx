import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/common";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { formatDateTimeFull, getLang, type Lang } from "@/lib/i18n/i18n";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { getOrderByNumber } from "@/services/orderService";
import { getSettingsOrDefault } from "@/services/settingsService";

export const dynamic = "force-dynamic";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

function fmt(iso: string, lang: Lang): string {
  return formatDateTimeFull(iso, lang);
}

/** Printable customer पावती (receipt) — open in a new tab, then Print / Save as PDF. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession("owner");
  const { id } = await params;
  const orderNumber = Number(id);
  if (!Number.isInteger(orderNumber) || orderNumber <= 0) notFound();

  const [lang, order, settings] = await Promise.all([
    getLang(),
    getOrderByNumber(orderNumber),
    getSettingsOrDefault(),
  ]);
  const settled = order.outstanding <= 0;
  const cancelled = order.status === "cancelled";
  const refundDue = order.refundDue;
  const mr = lang === "mr";

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[var(--background)] p-4 dark:bg-earth-950 font-sans">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/owner/payments"
          className="stitch-btn-secondary text-sm"
        >
          ← {mr ? "मागे" : "Back"}
        </Link>
        <PrintButton label={mr ? "प्रिंट / PDF" : "Print / PDF"} />
      </div>

      <article className="print-area rounded-2xl border border-[var(--border-subtle)] bg-white p-6 text-earth-900 shadow-soft sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-clay-100 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-earth-900 font-display">{settings.millName}</h1>
            {settings.address && <p className="text-sm text-earth-600">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-earth-600">फोन: {settings.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-clay-800 font-display">{mr ? "पावती" : "Receipt"}</p>
            <p className="text-sm font-semibold text-earth-700">Order #{order.orderId}</p>
            <p className="text-xs text-earth-500">{fmt(order.createdAt, lang)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b border-clay-100 py-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-earth-500 font-semibold">{mr ? "ग्राहक" : "Customer"}</p>
            <p className="font-bold text-base text-earth-900">{order.customer?.name ?? "—"}</p>
            {order.customer?.mobile && <p className="text-earth-600 font-medium">{order.customer.mobile}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-earth-500 font-semibold">{mr ? "स्थिती" : "Status"}</p>
            <p className="font-bold text-base text-clay-800">{order.status}</p>
            {cancelled && (
              <p className="mt-1 rounded-lg border border-haldi-400 bg-haldi-50 px-2 py-1 text-[11px] font-bold text-haldi-900">
                {mr ? "रद्द केलेला ऑर्डर" : "CANCELLED ORDER"}
              </p>
            )}
          </div>
        </section>

        <section className="py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-clay-100 text-left text-xs uppercase tracking-wide text-earth-500 font-semibold">
                <th className="py-2.5">{mr ? "धान्य" : "Grain"}</th>
                <th className="py-2.5">{mr ? "प्रकार" : "Size"}</th>
                <th className="py-2.5 text-right">{mr ? "वजन" : "Weight"}</th>
                <th className="py-2.5 text-right">{mr ? "दर" : "Rate"}</th>
                <th className="py-2.5 text-right">{mr ? "रक्कम" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-clay-50">
                <td className="py-2.5 font-medium">{grainLabel(order.grainType, lang)}</td>
                <td className="py-2.5 font-medium">{sizeLabel(order.requiredSize, lang)}</td>
                <td className="py-2.5 text-right font-medium">{order.weightKg} kg</td>
                <td className="py-2.5 text-right font-medium">{money(order.ratePerKg)}/kg</td>
                <td className="py-2.5 text-right font-bold text-earth-900">{money(order.totalCharges)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {order.payments.length > 0 && (
          <section className="border-t border-clay-100 py-4">
            <h2 className="mb-2 text-sm font-bold text-earth-900 font-display">{mr ? "पेमेंट नोंदी" : "Payments"}</h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {order.payments.map((p) => (
                <li key={p.recordedAt} className="flex items-center justify-between">
                  <span className="text-earth-600">
                    <span className="font-semibold text-leaf-700">✓</span> {p.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                    {p.upiTxnId && <span className="ml-1 text-earth-400">· {p.upiTxnId}</span>}
                    <span className="ml-2 text-xs text-earth-400">{fmt(p.recordedAt, lang)}</span>
                  </span>
                  <span className="font-bold text-earth-900">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-clay-100 pt-4">
          <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-earth-600">{mr ? "एकूण आकारणी" : "Total Charges"}</dt>
              <dd className="font-bold text-earth-900">{money(order.totalCharges)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-earth-600">{mr ? "वसूल" : "Paid"}</dt>
              <dd className="font-bold text-leaf-700">{money(order.paidAmount)}</dd>
            </div>
            {cancelled ? (
              <div className="flex justify-between border-t border-clay-100 pt-2">
                <dt className="font-bold text-earth-900">{mr ? "परत मिळणारी रक्कम" : "Refund Due"}</dt>
                <dd className={`font-bold text-base ${refundDue > 0 ? "text-haldi-700" : "text-earth-500"}`}>
                  {money(refundDue)}
                </dd>
              </div>
            ) : (
              <div className="flex justify-between border-t border-clay-100 pt-2">
                <dt className="font-bold text-earth-900">{mr ? "शिल्लक उधारी" : "Balance Due"}</dt>
                <dd className={`font-bold text-base ${settled ? "text-leaf-700" : "text-clay-700"}`}>
                  {money(order.outstanding)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <footer className="mt-8 flex items-end justify-between border-t border-earth-200 pt-4 text-xs text-earth-500">
          <p>{mr ? "धन्यवाद!" : "Thank you!"}</p>
          <div className="text-right">
            <p className="mb-6">{mr ? "स्वाक्षरी" : "Received by"}</p>
            <p className="border-t border-earth-400 pt-1">____________________</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
