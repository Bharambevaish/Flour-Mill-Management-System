"use client";

import { IconCard, IconCheck } from "@/components/common/Icons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { type Lang } from "@/lib/i18n/format";
import type { OrderView } from "@/services/orderService";
import type { PaymentClaimView } from "@/services/paymentClaimService";

export function PaymentClaimModal({
  orders,
  preselectedOrderId,
  lang,
  onClose,
  onSuccess,
}: {
  orders: OrderView[];
  preselectedOrderId?: string | null;
  lang: Lang;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  // Orders with remaining dues
  const dueOrders = orders.filter((o) => o.outstanding > 0 && o.status !== "cancelled");
  const defaultOrder =
    (preselectedOrderId ? dueOrders.find((o) => o.id === preselectedOrderId) : null) ??
    dueOrders[0] ??
    orders[0];

  const [selectedOrderId, setSelectedOrderId] = useState<string>(defaultOrder ? defaultOrder.id : "");
  const currentOrder = orders.find((o) => o.id === selectedOrderId);

  const [amount, setAmount] = useState<string>(
    currentOrder ? String(currentOrder.outstanding) : "",
  );
  const [upiTxnId, setUpiTxnId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleOrderChange(id: string) {
    setSelectedOrderId(id);
    const ord = orders.find((o) => o.id === id);
    if (ord && ord.outstanding > 0) {
      setAmount(String(ord.outstanding));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        lang === "mr"
          ? "फक्त फोटो किंवा स्क्रीनशॉट निवडा (PNG, JPG)"
          : "Please choose an image file (PNG, JPG)",
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(
        lang === "mr"
          ? "फोटो खूप मोठा आहे (कमाल 2 MB)"
          : "File is too large (max 2 MB)",
      );
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(
        lang === "mr" ? "कृपया योग्य रक्कम टाका" : "Please enter a valid amount",
      );
      return;
    }

    if (upiTxnId.trim().length < 4) {
      setError(
        lang === "mr"
          ? "कृपया ट्रान्झॅक्शन आयडी किंवा UTR नंबर टाका"
          : "Please enter the Transaction ID or UTR number",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ claim: PaymentClaimView }>("/api/my/payment-claims", {
        method: "POST",
        body: {
          orderId: selectedOrderId || null,
          amount: Math.round(parsedAmount * 100) / 100,
          upiTxnId: upiTxnId.trim(),
          receiptImage: receiptImage || null,
          notes: notes.trim() || undefined,
        },
      });

      if (!res.ok) {
        setError(
          res.error?.message ??
            (lang === "mr" ? "नोंद पाठवता आली नाही, कृपया पुन्हा प्रयत्न करा" : "Failed to submit. Please try again."),
        );
        return;
      }

      setSubmitted(true);
      router.refresh();
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch {
      setError(
        lang === "mr"
          ? "इंटरनेट अडचण, कृपया पुन्हा प्रयत्न करा"
          : "Network error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-claim-title"
    >
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-white p-6 shadow-2xl dark:border-earth-800 dark:bg-earth-900">
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === "mr" ? "बंद करा" : "Close"}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-xl text-earth-500 hover:bg-earth-100 dark:text-earth-400 dark:hover:bg-earth-800"
        >
          ×
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-50 text-2xl text-clay-600 dark:bg-clay-950/40 dark:text-clay-400">
            <IconCard className="h-6 w-6" />
          </div>
          <div>
            <h2
              id="payment-claim-title"
              className="text-xl font-bold text-earth-900 dark:text-earth-100 font-display"
            >
              {lang === "mr" ? "पेमेंट माहिती कळवा" : "Report Payment Done"}
            </h2>
            <p className="text-xs text-earth-500 dark:text-earth-400">
              {lang === "mr"
                ? "UPI / QR द्वारे पैसे पाठवले असल्यास येथे UTR किंवा पावती जोडा"
                : "Submit UPI transaction ID / receipt for verification"}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl bg-leaf-50 p-6 text-center text-leaf-800 dark:bg-leaf-950/30 dark:text-leaf-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-600 text-white"><IconCheck className="h-7 w-7" strokeWidth={3} /></span>
            <p className="mt-2 text-base font-bold">
              {lang === "mr"
                ? "पेमेंट माहिती यशस्वीरीत्या पाठवली!"
                : "Payment details submitted successfully!"}
            </p>
            <p className="mt-1 text-xs text-leaf-700 dark:text-leaf-400">
              {lang === "mr"
                ? "गिरणी मालकाकडून पडताळणी झाल्यानंतर तुमची उधारी अपडेट केली जाईल."
                : "The mill owner will verify and confirm your payment status shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-clay-200 bg-clay-50 p-3 text-xs font-semibold text-clay-700 dark:border-clay-900 dark:bg-clay-950/40 dark:text-clay-400">
                {error}
              </div>
            )}

            {/* Order Selector */}
            {dueOrders.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-400">
                  {lang === "mr" ? "ऑर्डर निवडा" : "Select Order"}
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-earth-300 bg-white px-3 py-2.5 text-sm font-medium text-earth-800 shadow-xs focus:border-clay-500 focus:outline-hidden dark:border-earth-700 dark:bg-earth-800 dark:text-earth-100"
                >
                  {dueOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Order #{o.orderId} — {lang === "mr" ? "उधारी" : "Due"}: ₹{o.outstanding}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-400">
                {lang === "mr" ? "पाठवलेली रक्कम (₹)" : "Amount Paid (₹)"}
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="उदा. 150"
                className="mt-1 w-full rounded-xl border border-earth-300 px-3.5 py-2.5 text-base font-bold text-earth-900 shadow-xs focus:border-clay-500 focus:outline-hidden dark:border-earth-700 dark:bg-earth-800 dark:text-earth-100"
              />
            </div>

            {/* Transaction ID / UTR */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-400">
                {lang === "mr" ? "ट्रान्झॅक्शन आयडी / UTR क्रमांक *" : "Transaction ID / UTR Number *"}
              </label>
              <input
                type="text"
                required
                value={upiTxnId}
                onChange={(e) => setUpiTxnId(e.target.value)}
                placeholder={lang === "mr" ? "उदा. 435123456789 किंवा UPI Ref ID" : "e.g. 435123456789 or UPI Ref"}
                className="mt-1 w-full rounded-xl border border-earth-300 px-3.5 py-2.5 text-sm font-mono text-earth-900 shadow-xs focus:border-clay-500 focus:outline-hidden dark:border-earth-700 dark:bg-earth-800 dark:text-earth-100"
              />
              <p className="mt-1 text-[11px] text-earth-500 dark:text-earth-400">
                {lang === "mr"
                  ? "Google Pay / PhonePe / Paytm मधील 12 अंकी UPI संदर्भ क्रमांक (UTR) टाका"
                  : "Enter the 12-digit UPI reference number from your payment app"}
              </p>
            </div>

            {/* Receipt Screenshot upload */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-400">
                {lang === "mr" ? "पेमेंट पावती / स्क्रीनशॉट (ऐच्छिक)" : "Payment Screenshot / Receipt (Optional)"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-xs text-earth-500 file:mr-3 file:rounded-xl file:border-0 file:bg-clay-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-clay-700 hover:file:bg-clay-100 dark:file:bg-earth-800 dark:file:text-earth-300"
              />
              {receiptImage && (
                <div className="relative mt-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptImage}
                    alt="Receipt preview"
                    className="h-28 w-auto rounded-xl border border-earth-200 object-contain dark:border-earth-700"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white shadow-md hover:bg-clay-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-earth-600 dark:text-earth-400">
                {lang === "mr" ? "टीप (ऐच्छिक)" : "Note (Optional)"}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={lang === "mr" ? "उदा. Google Pay वरून पाठवले" : "e.g. Paid via Google Pay"}
                className="mt-1 w-full rounded-xl border border-earth-300 px-3.5 py-2 text-sm text-earth-900 shadow-xs focus:border-clay-500 focus:outline-hidden dark:border-earth-700 dark:bg-earth-800 dark:text-earth-100"
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl border border-earth-300 px-4 text-sm font-semibold text-earth-700 hover:bg-earth-50 dark:border-earth-700 dark:text-earth-300 dark:hover:bg-earth-800"
              >
                {lang === "mr" ? "रद्द करा" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 rounded-xl bg-clay-600 px-5 text-sm font-bold text-white shadow-md hover:bg-clay-700 disabled:opacity-50"
              >
                {submitting
                  ? (lang === "mr" ? "पाठवत आहे..." : "Submitting...")
                  : (lang === "mr" ? "पेमेंट माहिती दाखल करा" : "Submit Payment Details")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
