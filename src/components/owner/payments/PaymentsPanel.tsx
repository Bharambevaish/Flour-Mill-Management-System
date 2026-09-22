"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, PrintButton } from "@/components/common";
import { downloadCsv, toCsv } from "@/lib/csv";
import { grainLabel, sizeLabel } from "@/lib/millings";
import type { Lang } from "@/lib/i18n/i18n";
import { PaymentModal } from "./PaymentModal";
import type { OrderView } from "@/services/orderService";

export function PaymentsPanel({
  orders,
  lang,
  duesOnly = false,
  customerId,
}: {
  orders: OrderView[];
  lang: Lang;
  duesOnly?: boolean;
  customerId?: string;
}) {
  const [payingOrder, setPayingOrder] = useState<OrderView | null>(null);

  const rows = useMemo(() => {
    const scoped = customerId
      ? orders.filter((o) => o.customer?.id === customerId)
      : [...orders];
    return scoped
      .filter((o) => !duesOnly || o.outstanding > 0)
      .sort((a, b) => {
        if (duesOnly && a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [orders, duesOnly, customerId]);

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
    ];
    const data = rows.map((o) => [
      o.orderId,
      new Date(o.createdAt).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN"),
      o.customer?.name ?? "",
      o.customer?.mobile ?? "",
      grainLabel(o.grainType, lang),
      sizeLabel(o.requiredSize, lang),
      o.weightKg,
      o.totalCharges,
      o.paidAmount,
      o.outstanding,
    ]);
    downloadCsv(`flour-mill-${duesOnly ? "outstanding" : "payments"}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, data));
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {duesOnly
          ? (lang === "mr" ? "कोणतीही उधारी शिल्लक नाही — सर्व पैसे जमा झाले आहेत." : "No outstanding dues — all accounts are fully settled.")
          : (lang === "mr" ? "अजुन कोणतीही पेमेंट नोंद उपलब्ध नाही." : "No payment records found.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {rows.length} {lang === "mr" ? "नोंदी" : "records"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ⬇ {lang === "mr" ? "CSV डाउनलोड" : "Download CSV"}
          </button>
          <PrintButton label={lang === "mr" ? "🖨 प्रिंट / PDF" : "🖨 Print / PDF"} />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((order) => (
          <li
            key={order.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Order #{order.orderId}
                </span>
                <StatusBadge status={order.status} lang={lang} />
                {order.outstanding > 0 ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-500/15 dark:text-rose-300">
                    {lang === "mr" ? `उधारी ₹ ${order.outstanding.toLocaleString("en-IN")}` : `Due ₹ ${order.outstanding.toLocaleString("en-IN")}`}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {lang === "mr" ? "पैसे पूर्ण" : "Fully Paid"}
                  </span>
                )}
              </div>

              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {order.customer ? order.customer.name : "—"}
                {order.customer && (
                  <span className="font-normal text-zinc-500 dark:text-zinc-400">
                    {" "}
                    · {order.customer.mobile}
                  </span>
                )}
              </p>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg ·{" "}
                {new Date(order.createdAt).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {order.payments.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {order.payments.map((p) => (
                    <li key={p.recordedAt} className="flex text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="mr-1 text-emerald-600 dark:text-emerald-400">✓</span>
                      {p.method === "upi" ? "UPI" : (lang === "mr" ? "रोख" : "Cash")} ₹{p.amount.toLocaleString("en-IN")}
                      {p.upiTxnId && <span className="ml-1 text-zinc-400">· {p.upiTxnId}</span>}
                      <span className="ml-1 text-zinc-400">· {new Date(p.recordedAt).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {lang === "mr" ? "एकूण ₹ " : "Total ₹ "}{order.totalCharges.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {lang === "mr" ? `वसूल ₹ ${order.paidAmount.toLocaleString("en-IN")}` : `Paid ₹ ${order.paidAmount.toLocaleString("en-IN")}`}
                </p>
              </div>
              <div className="no-print flex items-center gap-2">
                <Link
                  href={`/print/receipt/${order.orderId}`}
                  target="_blank"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {lang === "mr" ? "पावती" : "Receipt"}
                </Link>
                {order.outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayingOrder(order)}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
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
  );
}
