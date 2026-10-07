"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import type { PaymentClaimView } from "@/services/paymentClaimService";

export function PendingClaimsSection({
  initialClaims,
  lang,
}: {
  initialClaims: PaymentClaimView[];
  lang: Lang;
}) {
  const router = useRouter();
  const [claims, setClaims] = useState<PaymentClaimView[]>(initialClaims);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (claims.length === 0) return null;

  async function handleApprove(claim: PaymentClaimView) {
    setLoadingId(claim.id);
    setActionSuccess(null);
    try {
      const res = await apiFetch(`/api/owner/payment-claims/${claim.id}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        setClaims((prev) => prev.filter((c) => c.id !== claim.id));
        setActionSuccess(
          lang === "mr"
            ? `ऑर्डर #${claim.orderNumber ?? ""} चे ₹${claim.amount} चे पेमेंट यशस्वीरीत्या जमा झाले व ग्राहकाला कळवले!`
            : `Payment of ₹${claim.amount} for Order #${claim.orderNumber ?? ""} recorded & customer notified!`,
        );
        router.refresh();
      } else {
        alert(res.error?.message ?? "Error approving claim");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(claim: PaymentClaimView) {
    if (!rejectReason.trim()) return;
    setLoadingId(claim.id);
    setActionSuccess(null);
    try {
      const res = await apiFetch(`/api/owner/payment-claims/${claim.id}/reject`, {
        method: "PATCH",
        body: { reason: rejectReason.trim() },
      });
      if (res.ok) {
        setClaims((prev) => prev.filter((c) => c.id !== claim.id));
        setRejectingId(null);
        setRejectReason("");
        setActionSuccess(
          lang === "mr"
            ? `पेमेंट दावा नाकारला व ग्राहकाला कारण कळवले.`
            : `Payment claim rejected & reason sent to customer.`,
        );
        router.refresh();
      } else {
        alert(res.error?.message ?? "Error rejecting claim");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  }

  return (
    <section className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 via-rose-50/40 to-white p-5 shadow-lg dark:border-amber-700/60 dark:bg-zinc-900 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400/20 text-xl text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            🔔
          </span>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
              {lang === "mr" ? "ग्राहकांकडून आलेली पेमेंट पडताळणी" : "Incoming Customer Payment Claims"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lang === "mr"
                ? "ग्राहकांनी QR/UPI द्वारे पैसे भरून पाठवलेले UTR / पावत्या"
                : "Customers reported UPI payments via QR. Verify against bank account and approve."}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-xs">
          {claims.length} {lang === "mr" ? "प्रलंबित" : "Pending"}
        </span>
      </div>

      {actionSuccess && (
        <div className="mt-4 rounded-2xl bg-emerald-100/80 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          ✅ {actionSuccess}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {claims.map((c) => {
          const isRejecting = rejectingId === c.id;
          const isLoading = loadingId === c.id;

          return (
            <li
              key={c.id}
              className="flex flex-col gap-3.5 rounded-2xl border border-amber-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/90 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {c.customerName || "Customer"}
                    </span>
                    {c.customerMobile && (
                      <a
                        href={`tel:${c.customerMobile}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-400"
                      >
                        <span>📞</span>
                        <span>{c.customerMobile}</span>
                      </a>
                    )}
                    {c.orderNumber ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
                        Order #{c.orderNumber}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {lang === "mr" ? "सर्वसाधारण उधारी" : "Account Dues"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(c.createdAt, lang)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {lang === "mr" ? "दावा केलेली रक्कम" : "Claimed Amount"}
                  </span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹ {c.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* UTR details & Receipt preview */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/60">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-zinc-600 dark:text-zinc-400">
                    {lang === "mr" ? "UPI UTR / ट्रान्झॅक्शन आयडी:" : "UPI UTR / Txn ID:"}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {c.upiTxnId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(c.upiTxnId, c.id)}
                    className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {copiedId === c.id ? (lang === "mr" ? "कॉपी झाले" : "Copied") : (lang === "mr" ? "कॉपी" : "Copy")}
                  </button>
                </div>

                {c.receiptImage && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(c.receiptImage || null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 shadow-xs hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <span>📸</span>
                    <span>{lang === "mr" ? "पावती स्क्रीनशॉट पहा" : "View Receipt"}</span>
                  </button>
                )}
              </div>

              {c.notes && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-bold">{lang === "mr" ? "टीप: " : "Note: "}</span>
                  {c.notes}
                </p>
              )}

              {/* Actions */}
              {isRejecting ? (
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {lang === "mr" ? "नाकारण्याचे कारण द्या (ग्राहकाला दिसेल):" : "Rejection Reason (Visible to customer):"}
                  </p>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={
                      lang === "mr"
                        ? "उदा. बँकेत पेमेंट जमा झालेले नाही / चुकीचा UTR"
                        : "e.g. Payment not received in bank / invalid UTR"
                    }
                    className="w-full rounded-xl border border-rose-300 px-3 py-2 text-xs font-medium focus:outline-hidden dark:border-rose-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {lang === "mr" ? "रद्द करा" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading || !rejectReason.trim()}
                      onClick={() => handleReject(c)}
                      className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                    >
                      {isLoading ? "..." : lang === "mr" ? "दावा नाकारा" : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setRejectingId(c.id);
                      setRejectReason(lang === "mr" ? "बँक खात्यात पेमेंट जमा झालेले नाही." : "Payment not found in bank account.");
                    }}
                    className="min-h-10 rounded-xl border border-zinc-300 px-4 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {lang === "mr" ? "❌ नाकारा" : "❌ Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleApprove(c)}
                    className="min-h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                  >
                    {isLoading
                      ? (lang === "mr" ? "नोंदवत आहे..." : "Processing...")
                      : (lang === "mr" ? "✅ मंजूर करा व जमा नोंदवा" : "✅ Approve & Record Payment")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Full-size Receipt Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-3xl bg-zinc-950 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-xl font-bold text-white hover:bg-black"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Payment receipt proof"
              className="max-h-[85vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
