import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, IconPhone, IconCheck } from "@/components/common";
import { OrderDetailActions } from "@/components/owner/orders/OrderDetailActions";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { formatDateTimeFull, getLang, formatLang } from "@/lib/i18n/i18n";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { ORDER_LIFECYCLE_STATUSES } from "@/lib/order-status";
import { getOrderByNumber } from "@/services/orderService";

export const dynamic = "force-dynamic";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

const STEP: Record<string, { mr: string; en: string }> = {
  pending: { mr: "रांगेत (ऑर्डर मिळाली)", en: "Queued (order received)" },
  processing: { mr: "दळण सुरू", en: "Milling started" },
  completed: { mr: "तयार", en: "Ready" },
  collected: { mr: "ग्राहकाने घेतले", en: "Collected by customer" },
  cancelled: { mr: "रद्द", en: "Cancelled" },
};

/**
 * Order details — everything about one order on one page: who, what, the
 * money (with every receipt), the status journey with times, and the actions.
 * Addressed by the order NUMBER (`/owner/orders/12`), the same number printed
 * on the पावती and told to the customer.
 */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession("owner");
  const { id } = await params;
  const orderNumber = Number(id);
  if (!Number.isInteger(orderNumber) || orderNumber <= 0) notFound();

  const lang = await getLang();
  const order = await getOrderByNumber(orderNumber).catch(() => null);
  if (!order) notFound();
  const mr = lang === "mr";
  const L = (t: { mr: string; en: string }) => formatLang(t, lang);

  const at = new Map(order.statusHistory.map((h) => [h.status, h.at]));
  const steps =
    order.status === "cancelled"
      ? [...ORDER_LIFECYCLE_STATUSES.filter((s) => at.has(s)), "cancelled" as const]
      : [...ORDER_LIFECYCLE_STATUSES];
  const currentIdx = steps.indexOf(order.status as (typeof steps)[number]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-muted">
        <Link href="/owner/queue" className="font-medium text-clay-700 hover:underline dark:text-clay-400">
          {L({ mr: "दळण्याची यादी", en: "Queue" })}
        </Link>{" "}
        / {L({ mr: "ऑर्डर", en: "Order" })} #{order.orderId}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-clay-300 text-clay-700 dark:border-clay-800 dark:text-clay-400">
            <span className="text-[11px] font-semibold leading-none opacity-80">{mr ? "क्र." : "No."}</span>
            <span className="font-display text-3xl leading-none">{order.orderId}</span>
          </span>
          <div>
            <h1 className="text-3xl leading-tight text-heading">
              {grainLabel(order.grainType, lang)} · {order.weightKg} kg
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <StatusBadge status={order.status} lang={lang} />
              <span>{formatDateTimeFull(order.createdAt, lang)}</span>
            </div>
          </div>
        </div>
        <OrderDetailActions order={order} lang={lang} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Customer + order facts */}
          <section className="stitch-card p-5">
            <h2 className="text-lg text-heading">{L({ mr: "ऑर्डरचा तपशील", en: "Order details" })}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Fact label={L({ mr: "ग्राहक", en: "Customer" })}>
                {order.customer ? (
                  <>
                    <span className="block">{order.customer.name}</span>
                    <a href={`tel:${order.customer.mobile}`} className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-clay-700 hover:underline dark:text-clay-400">
                      <IconPhone className="h-3.5 w-3.5" />
                      {order.customer.mobile}
                    </a>
                  </>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label={L({ mr: "धान्य", en: "Grain" })}>{grainLabel(order.grainType, lang)}</Fact>
              <Fact label={L({ mr: "आकार", en: "Size" })}>{sizeLabel(order.requiredSize, lang)}</Fact>
              <Fact label={L({ mr: "वजन", en: "Weight" })}>{order.weightKg} kg</Fact>
              <Fact label={L({ mr: "दर", en: "Rate" })}>₹{order.ratePerKg}/kg</Fact>
              <Fact label={L({ mr: "एकूण आकारणी", en: "Total charges" })}>
                {money(order.totalCharges)}
                <span className="block text-xs font-normal text-muted">
                  {order.weightKg} × ₹{order.ratePerKg}
                </span>
              </Fact>
            </dl>
            {order.status === "cancelled" && (order.cancelReason || order.cancelledAt) && (
              <p className="mt-4 rounded-lg bg-earth-100 px-3 py-2 text-sm text-earth-700 dark:bg-earth-800 dark:text-earth-300">
                {L({ mr: "रद्द करण्याचे कारण", en: "Cancelled" })}: {order.cancelReason || "—"}
              </p>
            )}
          </section>

          {/* Money */}
          <section className="stitch-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg text-heading">{L({ mr: "पैसे", en: "Payments" })}</h2>
              {order.outstanding > 0 ? (
                <p className="text-right">
                  <span className="block text-xs font-semibold text-muted">{L({ mr: "शिल्लक बाकी", en: "Balance due" })}</span>
                  <span className="font-display text-3xl leading-none text-clay-700 dark:text-clay-400">{money(order.outstanding)}</span>
                </p>
              ) : order.refundDue > 0 ? (
                <p className="font-bold text-haldi-700 dark:text-haldi-300">
                  {L({ mr: "परत द्यायचे", en: "Refund due" })} {money(order.refundDue)}
                </p>
              ) : (
                <span className="paid-stamp text-sm text-leaf-700 dark:text-leaf-400">{L({ mr: "पैसे पूर्ण", en: "Paid in full" })}</span>
              )}
            </div>

            {/* paid vs total bar */}
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-earth-200 dark:bg-earth-800">
                <div
                  className="h-full rounded-full bg-leaf-600"
                  style={{ width: `${order.totalCharges > 0 ? Math.min(100, (order.paidAmount / order.totalCharges) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1.5 text-sm text-muted">
                {L({ mr: "जमा", en: "Paid" })} <span className="font-semibold text-heading">{money(order.paidAmount)}</span> /{" "}
                {money(order.totalCharges)}
              </p>
            </div>

            {order.payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{L({ mr: "अजून कोणतीही जमा रक्कम नाही.", en: "No payments recorded yet." })}</p>
            ) : (
              <ul className="mt-4 divide-y divide-dashed divide-[var(--border-strong)] border-t border-dashed border-[var(--border-strong)]">
                {order.payments.map((p) => (
                  <li key={p.recordedAt} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span>
                      <span className="font-semibold text-heading">{p.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}</span>
                      {p.upiTxnId && <span className="ml-1.5 font-mono text-xs text-muted">{p.upiTxnId}</span>}
                      <span className="block text-xs text-muted">{formatDateTimeFull(p.recordedAt, lang)}</span>
                    </span>
                    <span className="font-semibold text-leaf-700 dark:text-leaf-400">+ {money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Journey */}
        <section className="stitch-card self-start p-5">
          <h2 className="text-lg text-heading">{L({ mr: "ऑर्डरचा प्रवास", en: "Order journey" })}</h2>
          <ol className="mt-4">
            {steps.map((s, i) => {
              const reached = i <= currentIdx;
              // Only a step the order actually reached gets a time.
              const time = reached ? (at.get(s) ?? (s === "cancelled" ? order.cancelledAt : undefined)) : undefined;
              const last = i === steps.length - 1;
              return (
                <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${i < currentIdx ? "bg-earth-500 dark:bg-earth-400" : "bg-earth-200 dark:bg-earth-700"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      i === currentIdx
                        ? s === "cancelled"
                          ? "bg-earth-500 text-white"
                          : "bg-clay-600 text-white ring-4 ring-clay-100 dark:ring-clay-950"
                        : reached
                          ? "bg-earth-600 text-white dark:bg-earth-400 dark:text-earth-950"
                          : "border-2 border-earth-300 bg-surface dark:border-earth-700"
                    }`}
                  >
                    {i < currentIdx || (i === currentIdx && (last || s === "cancelled")) ? (
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : i === currentIdx ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <div>
                    <p className={`font-semibold ${reached ? "text-heading" : "text-earth-400 dark:text-earth-500"}`}>{L(STEP[s])}</p>
                    <p className="text-xs text-muted">
                      {time ? formatDateTimeFull(time, lang) : reached ? L({ mr: "वेळ माहित नाही", en: "time n/a" }) : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-heading">{children}</dd>
    </div>
  );
}
