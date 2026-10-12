"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, PrintButton } from "@/components/common";
import { downloadCsv, toCsv } from "@/lib/csv";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import { PaymentModal } from "./PaymentModal";
import { PendingClaimsSection } from "./PendingClaimsSection";
import type { OrderView } from "@/services/orderService";
import type { PaymentClaimView } from "@/services/paymentClaimService";

export function PaymentsPanel({
  orders,
  lang,
  duesOnly = false,
  cancelledOnly = false,
  customerId,
  pendingClaims = [],
}: {
  orders: OrderView[];
  lang: Lang;
  duesOnly?: boolean;
  /**
   * Cancelled-orders view (Queue page's Cancelled tab). Shows the retained
   * payment trail plus the refund due, and hides "Collect Payment" — a
   * cancelled order can never take another receipt, so offering the button
   * would only produce a 400.
   */
  cancelledOnly?: boolean;
  customerId?: string;
  pendingClaims?: PaymentClaimView[];
}) {
  const [payingOrder, setPayingOrder] = useState<OrderView | null>(null);

  const rows = useMemo(() => {
    const scoped = customerId
      ? orders.filter((o) => o.customer?.id === customerId)
      : [...orders];
    return scoped
      .filter((o) => (cancelledOnly ? o.status === "cancelled" : !duesOnly || o.outstanding > 0))
      .sort((a, b) => {
        // Biggest exposure first in the dues list; most recently cancelled first
        // in the cancelled list, since that's the one the owner is chasing.
        if (duesOnly && a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
        if (cancelledOnly) {
          const at = new Date(a.cancelledAt ?? a.updatedAt).getTime();
          const bt = new Date(b.cancelledAt ?? b.updatedAt).getTime();
          if (at !== bt) return bt - at;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [orders, duesOnly, cancelledOnly, customerId]);

  const autoOpen = useMemo(() => {
    if (!customerId) return null;
    const due = rows.filter((o) => o.outstanding > 0);
    return due.length === 1 ? due[0] : null;
  }, [rows, customerId]);

  function exportCsv() {
    const headers = [
      lang === "mr" ? "ऑर्डर क्र." : "Order #",
      lang === "mr" ? "दिनांक" : "Date",
      lang === "mr" ? "ग्राहक" : "Customer",
      lang === "mr" ? "मोबाईल" : "Mobile",
      lang === "mr" ? "धान्य" : "Grain",
      lang === "mr" ? "प्रकार" : "Size",
      lang === "mr" ? "वजन (किलो)" : "Weight (kg)",
      lang === "mr" ? "एकूण (₹)" : "Total (₹)",
      lang === "mr" ? "वसूल (₹)" : "Paid (₹)",
      lang === "mr" ? "उधारी (₹)" : "Due (₹)",
      ...(cancelledOnly
        ? [lang === "mr" ? "परत मिळणारी रक्कम (₹)" : "Refund Due (₹)"]
        : []),
      ...(cancelledOnly
        ? [lang === "mr" ? "रद्द करण्याची वेळ" : "Cancelled At"]
        : []),
      ...(cancelledOnly ? [lang === "mr" ? "कारण" : "Reason"] : []),
    ];
    const data = rows.map((o) => [
      o.orderId,
      formatDateTime(o.createdAt, lang),
      o.customer?.name ?? "",
      o.customer?.mobile ?? "",
      grainLabel(o.grainType, lang),
      sizeLabel(o.requiredSize, lang),
      o.weightKg,
      o.totalCharges,
      o.paidAmount,
      o.outstanding,
      ...(cancelledOnly
        ? [o.refundDue, o.cancelledAt ? formatDateTime(o.cancelledAt, lang) : "", o.cancelReason ?? ""]
        : []),
    ]);
    const slug = cancelledOnly ? "cancelled" : duesOnly ? "outstanding" : "payments";
    downloadCsv(`flour-mill-${slug}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, data));
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PendingClaimsSection initialClaims={pendingClaims} lang={lang} />
        <div className="rounded-2xl border border-dashed border-clay-200 bg-white/50 p-12 text-center text-earth-500 shadow-soft dark:border-earth-800 dark:bg-earth-900/50 dark:text-earth-400">
          <p className="text-base font-medium">
            {cancelledOnly
              ? (lang === "mr" ? "कोणतेही ऑर्डर रद्द केलेले नाहीत." : "No cancelled orders.")
              : duesOnly
                ? (lang === "mr" ? "कोणतीही उधारी शिल्लक नाही — सर्व पैसे जमा झाले आहेत." : "No outstanding dues — all accounts are fully settled.")
                : (lang === "mr" ? "अजुन कोणतीही पेमेंट नोंद उपलब्ध नाही." : "No payment records found.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PendingClaimsSection initialClaims={pendingClaims} lang={lang} />

      <div className="flex flex-col gap-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-earth-500 dark:text-earth-400">
          {rows.length} {lang === "mr" ? "नोंदी" : "records"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="stitch-btn-secondary text-xs sm:text-sm"
          >
            {lang === "mr" ? "CSV डाउनलोड" : "Download CSV"}
          </button>
          <PrintButton label={lang === "mr" ? "प्रिंट / PDF" : "Print / PDF"} />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((order) => (
          <li
            key={order.id}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-soft transition-all hover:border-clay-300 sm:flex-row sm:items-center sm:justify-between dark:border-earth-800 dark:bg-earth-900 dark:hover:border-earth-700"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/owner/orders/${order.orderId}`}
                  className="rounded-full border border-clay-100 bg-clay-50 px-2.5 py-0.5 text-xs font-semibold text-clay-800 hover:border-clay-300 dark:border-earth-700 dark:bg-earth-800 dark:text-earth-300"
                >
                  Order #{order.orderId}
                </Link>
                <StatusBadge status={order.status} lang={lang} />
                {cancelledOnly && order.refundDue > 0 && (
                  <span className="rounded-full bg-haldi-100 px-2.5 py-0.5 text-xs font-semibold text-haldi-800 dark:bg-haldi-500/15 dark:text-haldi-300">
                    {lang === "mr"
                      ? `परत मिळणारे ₹ ${order.refundDue.toLocaleString("en-IN")}`
                      : `Refund due ₹ ${order.refundDue.toLocaleString("en-IN")}`}
                  </span>
                )}
                {!cancelledOnly && (order.outstanding > 0 ? (
                  <span className="rounded-full bg-clay-100 px-2.5 py-0.5 text-xs font-semibold text-clay-800 dark:bg-clay-500/15 dark:text-clay-300">
                    {lang === "mr" ? `उधारी ₹ ${order.outstanding.toLocaleString("en-IN")}` : `Due ₹ ${order.outstanding.toLocaleString("en-IN")}`}
                  </span>
                ) : (
                  <span className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-xs font-semibold text-leaf-800 dark:bg-leaf-500/15 dark:text-leaf-300">
                    {lang === "mr" ? "पैसे पूर्ण" : "Fully Paid"}
                  </span>
                ))}
              </div>

              <p className="truncate text-base font-semibold text-earth-900 dark:text-earth-100">
                {order.customer ? order.customer.name : "—"}
                {order.customer && (
                  <span className="font-normal text-sm text-earth-500 dark:text-earth-400">
                    {" "}
                    · {order.customer.mobile}
                  </span>
                )}
              </p>

              <p className="text-xs text-earth-500 dark:text-earth-400">
                {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg ·{" "}
                {formatDateTime(order.createdAt, lang)}
              </p>

              {cancelledOnly && (order.cancelledAt || order.cancelReason) && (
                <p className="mt-1 text-xs font-medium text-earth-500 dark:text-earth-400">
                  {order.cancelledAt && (
                    <span>
                      {lang === "mr" ? "रद्द: " : "Cancelled: "}
                      {formatDateTime(order.cancelledAt, lang)}
                    </span>
                  )}
                  {order.cancelledAt && order.cancelReason ? " · " : null}
                  {order.cancelReason}
                </p>
              )}

              {order.payments.length > 0 && (
                <ul className="flex flex-col gap-1 mt-1 rounded-xl bg-earth-50 p-2.5 dark:bg-earth-800/40">
                  {order.payments.map((p) => (
                    <li key={p.recordedAt} className="flex flex-wrap items-center text-xs text-earth-600 dark:text-earth-400">
                      <span className="mr-1.5 font-bold text-leaf-600 dark:text-leaf-400">✓</span>
                      <span className="font-medium text-earth-900 dark:text-earth-200">
                        {p.method === "upi" ? "UPI" : (lang === "mr" ? "रोख" : "Cash")} ₹{p.amount.toLocaleString("en-IN")}
                      </span>
                      {p.upiTxnId && <span className="ml-1 text-earth-400">· {p.upiTxnId}</span>}
                      <span className="ml-1 text-earth-400">· {formatDateTime(p.recordedAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-clay-50 pt-3 sm:border-0 sm:pt-0 sm:flex-col sm:items-end">
              <div className="text-right">
                <p className="text-base font-bold text-earth-900 dark:text-earth-100">
                  {lang === "mr" ? "एकूण ₹ " : "Total ₹ "}{order.totalCharges.toLocaleString("en-IN")}
                </p>
                <p className="text-xs font-medium text-earth-500 dark:text-earth-400">
                  {lang === "mr" ? `वसूल ₹ ${order.paidAmount.toLocaleString("en-IN")}` : `Paid ₹ ${order.paidAmount.toLocaleString("en-IN")}`}
                </p>
              </div>
              <div className="no-print flex items-center gap-2">
                <Link
                  href={`/print/receipt/${order.orderId}`}
                  target="_blank"
                  className="stitch-btn-secondary text-xs sm:text-sm"
                >
                  {lang === "mr" ? "पावती" : "Receipt"}
                </Link>
                {!cancelledOnly && order.outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayingOrder(order)}
                    className="stitch-btn-primary text-xs sm:text-sm"
                  >
                    {lang === "mr" ? "पैसे स्वीकारा" : "Collect Payment"}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(payingOrder ?? autoOpen) && (
        <PaymentModal
          order={payingOrder ?? autoOpen!}
          lang={lang}
          onClose={() => setPayingOrder(null)}
        />
      )}
      </div>
    </div>
  );
}
