"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { grainLabel, sizeLabel } from "@/lib/millings";
import type { Lang } from "@/lib/i18n/i18n";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Record payment"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Order #{order.orderId}
              </span>
              <StatusBadge status={order.status} lang={lang} />
            </div>
            <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {order.customer ? order.customer.name : "—"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "एकूण किंमत" : "Total Charges"}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                ₹ {order.totalCharges.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "वसूल जमा" : "Paid Amount"}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                ₹ {order.paidAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "शिल्लक बाकी" : "Balance Due"}</p>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                ₹ {order.outstanding.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {order.payments.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              {order.payments.map((p) => (
                <li key={p.recordedAt} className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                  <span>
                    {p.method === "upi" ? "UPI" : (lang === "mr" ? "रोख" : "Cash")}
                    {p.upiTxnId && <span className="text-zinc-400"> · {p.upiTxnId}</span>}
                  </span>
                  <span className="font-medium">
                    + ₹{p.amount.toLocaleString("en-IN")} ·{" "}
                    {new Date(p.recordedAt).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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

          <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
            <span className="text-zinc-600 dark:text-zinc-300">{lang === "mr" ? "नवीन उधारी बाकी" : "New Remaining Balance"}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              ₹ {newOutstanding.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {lang === "mr" ? "रद्द करा" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting || order.outstanding <= 0}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "..." : (lang === "mr" ? "नोंदवा" : "Save Receipt")}
          </button>
        </div>
      </div>
    </div>
  );
}