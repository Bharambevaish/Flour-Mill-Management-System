"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { grainLabel, sizeLabel } from "@/lib/millings";
import type { Lang } from "@/lib/i18n/i18n";
import { StatusBadge } from "@/components/common";
import { PaymentEntry } from "@/components/owner/payments";
import type { OrderView } from "@/services/orderService";
import type { OrderStatus, PaymentMethod } from "@/models/Order";

const NEXT_STEP: Partial<Record<OrderStatus, { mr: string; en: string; to: OrderStatus }>> = {
  pending: { mr: "दळण्यास सुरू करा", en: "Start Milling", to: "processing" },
  processing: { mr: "तयार झाले", en: "Mark as Ready", to: "completed" },
  completed: { mr: "घेतला (हस्तांतरित)", en: "Mark as Collected", to: "collected" },
};

export function OrderActionModal({
  order,
  onClose,
  lang,
}: {
  order: OrderView;
  onClose: () => void;
  lang: Lang;
}) {
  const router = useRouter();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-earth-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Order update"
    >
      <div className="stitch-card relative w-full max-w-md overflow-hidden p-6 shadow-2xl dark:border-earth-800 dark:bg-earth-900">

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-clay-200/80 bg-clay-50 px-2.5 py-0.5 text-xs font-bold text-clay-800 shadow-xs dark:border-earth-700 dark:bg-earth-800 dark:text-earth-300">
                {lang === "mr" ? `रांग क्र. ${order.queueNo ?? order.orderId}` : `Queue Token #${order.queueNo ?? order.orderId}`}
              </span>
              <span className="inline-flex items-center rounded-full border border-clay-100 bg-clay-50/60 px-2 py-0.5 text-xs text-muted dark:border-earth-700 dark:bg-earth-800 dark:text-earth-400">
                Order #{order.orderId}
              </span>
              <StatusBadge status={order.status} lang={lang} />
            </div>
            <p className="mt-2 text-base font-bold text-earth-900 dark:text-earth-100">
              {order.customer ? order.customer.name : "—"}
            </p>
            <p className="text-xs font-medium text-muted dark:text-earth-400">
              {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} · {order.weightKg} kg ·{" "}
              ₹{order.ratePerKg}/kg
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
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "एकूण आकारणी" : "Total Charges"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-earth-900 dark:text-earth-100">
                ₹ {total.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "वसूल रक्कम" : "Paid Amount"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-leaf-700 dark:text-leaf-400">
                ₹ {order.paidAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted dark:text-earth-400">{lang === "mr" ? "शिल्लक बाकी" : "Balance Due"}</p>
              <p className="mt-0.5 text-sm font-extrabold text-clay-700 dark:text-clay-400">
                ₹ {outstanding.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {next && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="rounded-full border border-clay-200 bg-clay-50 px-2.5 py-0.5 text-xs text-clay-800 dark:border-earth-700 dark:bg-earth-800 dark:text-earth-400">
                {order.status}
              </span>
              <span aria-hidden="true" className="text-clay-400">→</span>
              <span className="rounded-full border border-clay-200 bg-clay-100 px-2.5 py-0.5 text-xs font-bold text-clay-800 dark:border-earth-700 dark:bg-earth-800 dark:text-earth-200">
                {lang === "mr" ? next.mr : next.en}
              </span>
            </div>
            {next.to === "collected" && (
              <p className="mt-2 text-xs font-medium text-muted dark:text-earth-400">
                {lang === "mr"
                  ? "घेतल्यावर ही ऑर्डर रांगेतून काढली जाईल; उधारी शिल्लक असल्यास खात्यात राहील."
                  : "Collected orders leave the live queue; any unpaid balance remains on account."}
              </p>
            )}
          </div>
        )}

        {outstanding > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-clay-200/80 bg-clay-50/40 px-3 py-2 text-xs font-semibold text-clay-950 dark:border-earth-800 dark:bg-earth-950 dark:text-earth-200">
              <input
                type="checkbox"
                checked={recordPay}
                onChange={(e) => {
                  setRecordPay(e.target.checked);
                  if (e.target.checked) setPayAmount(String(outstanding));
                }}
                className="h-4 w-4 rounded border-clay-300 accent-clay-600"
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
                lang={lang}
              />
            )}

            <div className="flex items-center justify-between rounded-xl border border-clay-200/80 bg-clay-50/50 px-3.5 py-2 text-xs font-semibold dark:border-earth-800 dark:bg-earth-950">
              <span className="text-muted dark:text-earth-300">{lang === "mr" ? "नवीन शिल्लक उधारी" : "New Remaining Due"}</span>
              <span className="font-extrabold text-earth-900 dark:text-earth-100">
                ₹ {newOutstanding.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {outstanding <= 0 && (
          <p className="mt-4 rounded-xl border border-leaf-200 bg-leaf-50 px-3.5 py-2 text-xs font-semibold text-leaf-800 dark:border-leaf-500/30 dark:bg-leaf-950/20 dark:text-leaf-300">
            {lang === "mr" ? "या ऑर्डरचे पैसे पूर्ण जमा झाले आहेत." : "This order is fully paid."}
          </p>
        )}

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
            disabled={submitting || !next}
            className="stitch-btn-primary px-4 py-2 text-xs"
          >
            {submitting ? "..." : (lang === "mr" ? `${next?.mr ?? ""} व सेव्ह` : `${next?.en ?? ""} & Save`)}
          </button>
        </div>
      </div>
    </div>
  );
}