"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import { StatusBadge } from "@/components/common";
import { PaymentEntry } from "./PaymentEntry";
import type { OrderView } from "@/services/orderService";
import type { PaymentMethod } from "@/models/Order";

export function PaymentModal({
  order,
  lang,
  onClose,
}: {
  order: OrderView;
  lang: Lang;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>(order.outstanding > 0 ? String(order.outstanding) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseFloat(amount);
  const amountValid = Number.isFinite(parsed) && parsed > 0 && parsed <= order.outstanding + 1e-9;
  const upiValid = method !== "upi" || upiTxnId.trim().length >= 6;

  const newPaid = Math.min(
    order.paidAmount + (amountValid ? Math.round(parsed * 100) / 100 : 0),
    order.totalCharges,
  );
  const newOutstanding = Math.max(0, Math.round((order.totalCharges - newPaid) * 100) / 100);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!amountValid || !upiValid) {
      setError(
        lang === "mr"
          ? "रक्कम किंवा UPI आयडी बरोबर भरा"
          : "Please enter a valid amount or UPI Transaction ID"
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: OrderView }>(`/api/orders/${order.id}/payment`, {
        method: "PATCH",
        body: {
          amount: Math.round(parsed * 100) / 100,
          method,
          upiTxnId: method === "upi" ? upiTxnId.trim() : undefined,
        },
      });
      if (!res.ok) {
        setError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Payment failed. Please try again."));
        return;
      }
      router.refresh();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-earth-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Record payment"
    >
      <div className="stitch-card relative w-full max-w-md overflow-hidden p-6 shadow-2xl dark:border-earth-800 dark:bg-earth-900">

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-clay-200/80 bg-clay-50 px-2.5 py-0.5 text-xs font-bold text-clay-800 shadow-xs dark:border-earth-700 dark:bg-earth-800 dark:text-earth-300">
                Order #{order.orderId}
              </span>
              <StatusBadge status={order.status} lang={lang} />
            </div>
            <p className="mt-2 text-base font-bold text-earth-900 dark:text-earth-100">
              {order.customer ? order.customer.name : "—"}
            </p>
            <p className="text-xs font-medium text-muted dark:text-earth-400">
              {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-1.5 text-clay-400 transition-colors hover:bg-clay-50 hover:text-clay-700 dark:text-earth-400 dark:hover:bg-earth-800"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-clay-200/80 bg-clay-50/40 p-3.5 dark:border-earth-800 dark:bg-earth-950">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "एकूण किंमत" : "Total Charges"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-earth-900 dark:text-earth-100">
                ₹ {order.totalCharges.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "वसूल जमा" : "Paid Amount"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-leaf-700 dark:text-leaf-400">
                ₹ {order.paidAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "शिल्लक बाकी" : "Balance Due"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-clay-700 dark:text-clay-400">
                ₹ {order.outstanding.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {order.payments.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-3 dark:border-earth-800">
              {order.payments.map((p) => (
                <li key={p.recordedAt} className="flex items-center justify-between text-xs text-muted dark:text-earth-300">
                  <span>
                    {p.method === "upi" ? "UPI" : (lang === "mr" ? "रोख" : "Cash")}
                    {p.upiTxnId && <span className="text-earth-400"> · {p.upiTxnId}</span>}
                  </span>
                  <span className="font-semibold text-clay-900 dark:text-clay-300">
                    + ₹{p.amount.toLocaleString("en-IN")} ·{" "}
                    {formatDateTime(p.recordedAt, lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <PaymentEntry
            amount={amount}
            onAmountChange={setAmount}
            method={method}
            onMethodChange={setMethod}
            upiTxnId={upiTxnId}
            onUpiTxnIdChange={setUpiTxnId}
            max={order.outstanding}
            heading={lang === "mr" ? "पेमेंट नोंदवा" : "Record Payment Receipt"}
            lang={lang}
          />

          <div className="mt-3 flex items-center justify-between rounded-xl border border-clay-200/80 bg-clay-50/50 px-3.5 py-2 text-xs font-semibold dark:border-earth-800 dark:bg-earth-950">
            <span className="text-muted dark:text-earth-300">{lang === "mr" ? "नवीन उधारी बाकी" : "New Remaining Balance"}</span>
            <span className="font-extrabold text-earth-900 dark:text-earth-100">
              ₹ {newOutstanding.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-clay-200 bg-clay-50 p-2.5 text-xs font-semibold text-clay-800 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="stitch-btn-secondary px-3.5 py-2 text-xs"
          >
            {lang === "mr" ? "रद्द करा" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting || order.outstanding <= 0}
            className="stitch-btn-primary px-4 py-2 text-xs"
          >
            {submitting ? "..." : (lang === "mr" ? "नोंदवा" : "Save Receipt")}
          </button>
        </div>
      </div>
    </div>
  );
}