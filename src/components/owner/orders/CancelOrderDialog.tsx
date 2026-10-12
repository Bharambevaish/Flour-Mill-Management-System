"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import type { OrderView } from "@/services/orderService";

/**
 * Confirmation dialog for soft-cancelling an order.
 *
 * Copy is deliberately blunt about the one thing that surprises people: if the
 * order is already paid, cancelling does NOT hand the money back. It parks the
 * amount as a refund due on the cancelled order, because the mill's money
 * handling is a separate manual step. The dialog says so before the owner
 * commits rather than after.
 */
export function CancelOrderDialog({
  order,
  onClose,
  lang,
}: {
  order: OrderView;
  onClose: () => void;
  lang: Lang;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPaid = order.paidAmount > 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      // `id` is the document id, matching every other /api/orders/[id]/* route.
      // `orderId` is only the human-facing token number and is NOT a valid key.
      const res = await apiFetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        body: { reason: reason.trim() || undefined },
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setError(res.error?.message ?? (lang === "mr" ? "रद्द करता आले नाही" : "Could not cancel"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (lang === "mr" ? "रद्द करता आले नाही" : "Could not cancel"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={lang === "mr" ? "बंद करा" : "Close"}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-t-3xl border border-[var(--border-subtle)] bg-white p-6 pb-8 shadow-2xl sm:rounded-3xl dark:border-earth-800 dark:bg-earth-900"
      >
        <h3 className="text-lg font-bold text-earth-900 dark:text-earth-100 font-display">
          {lang === "mr" ? "ऑर्डर रद्द करायचा?" : "Cancel this order?"}
        </h3>

        <div className="mt-3 rounded-2xl bg-earth-50 p-3 text-sm dark:bg-earth-800">
          <p className="font-semibold text-earth-900 dark:text-earth-100">
            #{order.orderId} · {order.customer?.name ?? ""}
          </p>
          <p className="text-earth-600 dark:text-earth-400">
            {order.grainType} · {order.weightKg} kg ·{" "}
            {formatDateTime(order.createdAt, lang)}
          </p>
        </div>

        {hasPaid ? (
          <div className="mt-4 rounded-2xl border border-haldi-300 bg-haldi-50 p-3 text-sm font-medium text-haldi-900 dark:border-haldi-500/30 dark:bg-haldi-500/10 dark:text-haldi-200">
            <p>
              {lang === "mr"
                ? `या ऑर्डरवर ₹${order.paidAmount.toLocaleString("en-IN")} जमा आहेत.`
                : `₹${order.paidAmount.toLocaleString("en-IN")} is already paid on this order.`}
            </p>
            <p className="mt-1">
              {lang === "mr"
                ? "रद्द केल्यावर रक्कम परत मिळणारी रक्कम म्हणून दाखवली जाईल. पैसे परत करणे ही स्वतंत्र प्रक्रिया आहे."
                : "On cancel this amount will be shown as a refund due. Returning the money is a separate manual step."}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-earth-600 dark:text-earth-400">
            {lang === "mr"
              ? "या ऑर्डरवर पैसे जमा नाहीत."
              : "No payment has been recorded on this order."}
          </p>
        )}

        <p className="mt-4 text-sm text-earth-600 dark:text-earth-400">
          {lang === "mr"
            ? "ऑर्डर कायम राहील, फक्त रद्द म्हणून दाखवला जाईल. कारण लिहा (ऐच्छिक):"
            : "The order is kept and just marked cancelled. Add a reason (optional):"}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder={
            lang === "mr" ? "उदा. ग्राहकाने रद्द केले / e.g. Customer withdrew" : "e.g. Customer withdrew"
          }
          className="stitch-input mt-2 text-sm"
        />

        {error && (
          <p className="mt-3 text-sm font-semibold text-clay-600 dark:text-clay-400">{error}</p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="stitch-btn-secondary text-sm"
          >
            {lang === "mr" ? "नको रद्द करत" : "Keep order"}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="stitch-btn-primary text-sm"
          >
            {busy
              ? lang === "mr"
                ? "रद्द करत आहे..."
                : "Cancelling..."
              : lang === "mr"
                ? "हो, रद्द करा"
                : "Yes, cancel order"}
          </button>
        </div>
      </div>
    </div>
  );
}
