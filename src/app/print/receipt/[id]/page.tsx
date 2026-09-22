import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/common";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang } from "@/lib/i18n/i18n";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { getOrderByNumber } from "@/services/orderService";
import { getSettingsOrDefault } from "@/services/settingsService";

export const dynamic = "force-dynamic";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

function fmt(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const mr = lang === "mr";
  const locale = mr ? "mr-IN" : "en-IN";
  const settled = order.outstanding <= 0;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-zinc-100 p-4 dark:bg-zinc-950">
      <div className="no-print mb-3 flex items-center justify-between">
        <Link
          href="/owner/payments"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← {mr ? "मागे" : "Back"}
        </Link>
        <PrintButton label={mr ? "🖨 प्रिंट / PDF" : "🖨 Print / PDF"} />
      </div>

      <article className="print-area rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-xl font-bold">{settings.millName}</h1>
            {settings.address && <p className="text-sm text-zinc-600">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-zinc-600">📞 {settings.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{mr ? "पावती" : "Receipt"}</p>
            <p className="text-sm text-zinc-600">Order #{order.orderId}</p>
            <p className="text-xs text-zinc-500">{fmt(order.createdAt, locale)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 border-b border-zinc-200 py-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{mr ? "ग्राहक" : "Customer"}</p>
            <p className="font-semibold">{order.customer?.name ?? "—"}</p>
            {order.customer?.mobile && <p className="text-zinc-600">{order.customer.mobile}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{mr ? "स्थिती" : "Status"}</p>
            <p className="font-semibold">{order.status}</p>
          </div>
        </section>

        <section className="py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2">{mr ? "धान्य" : "Grain"}</th>
                <th className="py-2">{mr ? "प्रकार" : "Size"}</th>
                <th className="py-2 text-right">{mr ? "वजन" : "Weight"}</th>
                <th className="py-2 text-right">{mr ? "दर" : "Rate"}</th>
                <th className="py-2 text-right">{mr ? "रक्कम" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100">
                <td className="py-2">{grainLabel(order.grainType, lang)}</td>
                <td className="py-2">{sizeLabel(order.requiredSize, lang)}</td>
                <td className="py-2 text-right">{order.weightKg} kg</td>
                <td className="py-2 text-right">{money(order.ratePerKg)}/kg</td>
                <td className="py-2 text-right font-medium">{money(order.totalCharges)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {order.payments.length > 0 && (
          <section className="border-t border-zinc-200 py-4">
            <h2 className="mb-2 text-sm font-semibold">{mr ? "पेमेंट नोंदी" : "Payments"}</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {order.payments.map((p) => (
                <li key={p.recordedAt} className="flex items-center justify-between">
                  <span className="text-zinc-600">
                    {p.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                    {p.upiTxnId && <span className="ml-1 text-zinc-400">· {p.upiTxnId}</span>}
                    <span className="ml-2 text-xs text-zinc-400">{fmt(p.recordedAt, locale)}</span>
                  </span>
                  <span className="font-medium">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-zinc-200 pt-4">
          <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">{mr ? "एकूण आकारणी" : "Total Charges"}</dt>
              <dd className="font-medium">{money(order.totalCharges)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600">{mr ? "वसूल" : "Paid"}</dt>
              <dd className="font-medium text-emerald-700">{money(order.paidAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-1">
              <dt className="font-semibold">{mr ? "शिल्लक उधारी" : "Balance Due"}</dt>
              <dd className={`font-bold ${settled ? "text-emerald-700" : "text-rose-700"}`}>
                {money(order.outstanding)}
              </dd>
            </div>
          </dl>
        </section>

        <footer className="mt-8 flex items-end justify-between border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          <p>{mr ? "धन्यवाद!" : "Thank you!"}</p>
          <div className="text-right">
            <p className="mb-6">{mr ? "स्वाक्षरी" : "Received by"}</p>
            <p className="border-t border-zinc-400 pt-1">____________________</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
