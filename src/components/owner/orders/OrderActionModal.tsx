"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { StatusBadge } from "@/components/common";
import { PaymentEntry } from "@/components/owner/payments";
import type { OrderView } from "@/services/orderService";
import type { OrderStatus, PaymentMethod } from "@/models/Order";

function useLang(): "mr" | "en" {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    if (match && (match[1] === "mr" || match[1] === "en")) {
      return match[1];
    }
  }
  return "en";
}

const NEXT_STEP: Partial<Record<OrderStatus, { mr: string; en: string; to: OrderStatus }>> = {
  pending: { mr: "दळण्यास सुरू करा", en: "Start Milling", to: "processing" },
  processing: { mr: "तयार झाले", en: "Mark as Ready", to: "completed" },
  completed: { mr: "घेतला (हस्तांतरित)", en: "Mark as Collected", to: "collected" },
};

export function OrderActionModal({
  order,
  onClose,
}: {
  order: OrderView;
  onClose: () => void;
}) {
  const router = useRouter();
  const lang = useLang();
  const next = NEXT_STEP[order.status];

  const [recordPay, setRecordPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = order.totalCharges;
  const outstanding = order.outstanding;
  const parsedAmount = parseFloat(payAmount);
  const payValid =
    !recordPay ||
    (Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= outstanding + 1e-9);
  const upiValid = !recordPay || method !== "upi" || upiTxnId.trim().length >= 6;

  const paymentToApply =
    recordPay && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100) / 100
      : 0;
  const newOutstanding = Math.max(0, Math.round((outstanding - paymentToApply) * 100) / 100);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!next) return;
    if (!payValid) {
      setError(
        lang === "mr"
          ? "कृपया 0 पेक्षा जास्त आणि शिल्लक उधारीपेक्षा कमी रक्कम टाका."
          : "Please enter a valid amount less than or equal to balance due."
      );
      return;
    }
    if (!upiValid) {
      setError(
        lang === "mr"
          ? "कृपया कमीत कमी 6 अक्षरांचा UPI Transaction ID टाका."
          : "Please enter a valid UPI Transaction ID (min 6 chars)."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: {
        status: OrderStatus;
        payment?: { amount: number; method: PaymentMethod; upiTxnId?: string };
      } = { status: next.to };

      if (paymentToApply > 0) {
        payload.payment = {
          amount: paymentToApply,
          method,
          ...(method === "upi" ? { upiTxnId: upiTxnId.trim() } : {}),
        };
      }

      const res = await apiFetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload,
      });

      if (!res.ok) {
        setError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Update failed. Please try again."));
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
      aria-label="Order update"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {lang === "mr" ? `रांग क्र. ${order.queueNo ?? order.orderId}` : `Queue Token #${order.queueNo ?? order.orderId}`}
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Order #{order.orderId}
              </span>
              <StatusBadge status={order.status} lang={lang} />
            </div>
            <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {order.customer ? order.customer.name : "—"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg ·{" "}
              ₹{order.ratePerKg}/kg
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "एकूण आकारणी" : "Total Charges"}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                ₹ {total.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "वसूल रक्कम" : "Paid Amount"}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                ₹ {order.paidAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{lang === "mr" ? "शिल्लक बाकी" : "Balance Due"}</p>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                ₹ {outstanding.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {next && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {order.status}
              </span>
              <span aria-hidden="true" className="text-zinc-400">→</span>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {lang === "mr" ? next.mr : next.en}
              </span>
            </div>
            {next.to === "collected" && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {lang === "mr"
                  ? "घेतल्यावर ही ऑर्डर रांगेतून काढली जाईल; उधारी शिल्लक असल्यास खात्यात राहील."
                  : "Collected orders leave the live queue; any unpaid balance remains on account."}
              </p>
            )}
          </div>
        )}

        {outstanding > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <input
                type="checkbox"
                checked={recordPay}
                onChange={(e) => {
                  setRecordPay(e.target.checked);
                  if (e.target.checked) setPayAmount(String(outstanding));
                }}
                className="accent-zinc-900 dark:accent-zinc-100"
              />
              <span>{lang === "mr" ? "या टप्प्यावर जमा रक्कम नोंदवा" : "Record Payment with Status Change"}</span>
            </label>

            {recordPay && (
              <PaymentEntry
                amount={payAmount}
                onAmountChange={setPayAmount}
                method={method}
                onMethodChange={setMethod}
                upiTxnId={upiTxnId}
                onUpiTxnIdChange={setUpiTxnId}
                max={outstanding}
                heading={lang === "mr" ? "जमा रक्कम विवरण" : "Payment Entry"}
              />
            )}

            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
              <span className="text-zinc-600 dark:text-zinc-300">{lang === "mr" ? "नवीन शिल्लक उधारी" : "New Remaining Due"}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                ₹ {newOutstanding.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {outstanding <= 0 && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {lang === "mr" ? "या ऑर्डरचे पैसे पूर्ण जमा झाले आहेत." : "This order is fully paid."}
          </p>
        )}

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
            disabled={submitting || !next}
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? "..." : (lang === "mr" ? `${next?.mr ?? ""} व सेव्ह` : `${next?.en ?? ""} & Save`)}
          </button>
        </div>
      </div>
    </div>
  );
}