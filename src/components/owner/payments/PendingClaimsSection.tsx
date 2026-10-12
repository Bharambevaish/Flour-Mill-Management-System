"use client";

import { IconBell, IconPhone, IconCamera } from "@/components/common/Icons";
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
    <section className="rounded-2xl border border-haldi-300 bg-haldi-50 p-5 dark:border-haldi-700/60 dark:bg-earth-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-haldi-200/80 pb-4 dark:border-earth-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-haldi-400/20 text-xl text-haldi-700 dark:bg-haldi-500/20 dark:text-haldi-300">
            <IconBell className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-earth-900 dark:text-earth-100 font-display">
              {lang === "mr" ? "ग्राहकांकडून आलेली पेमेंट पडताळणी" : "Incoming Customer Payment Claims"}
            </h2>
            <p className="text-xs text-earth-500 dark:text-earth-400">
              {lang === "mr"
                ? "ग्राहकांनी QR/UPI द्वारे पैसे भरून पाठवलेले UTR / पावत्या"
                : "Customers reported UPI payments via QR. Verify against bank account and approve."}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-haldi-500 px-3 py-1 text-xs font-black text-white shadow-xs">
          {claims.length} {lang === "mr" ? "प्रलंबित" : "Pending"}
        </span>
      </div>

      {actionSuccess && (
        <div className="mt-4 rounded-2xl bg-leaf-100/80 p-3 text-xs font-bold text-leaf-800 dark:bg-leaf-950/50 dark:text-leaf-300">
          {actionSuccess}
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {claims.map((c) => {
          const isRejecting = rejectingId === c.id;
          const isLoading = loadingId === c.id;

          return (
            <li
              key={c.id}
              className="flex flex-col gap-3.5 rounded-2xl border border-haldi-200/90 bg-white p-4 shadow-sm dark:border-earth-700 dark:bg-earth-800/90 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-earth-900 dark:text-earth-100">
                      {c.customerName || "Customer"}
                    </span>
                    {c.customerMobile && (
                      <a
                        href={`tel:${c.customerMobile}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-clay-700 hover:underline dark:text-clay-400"
                      >
                        <IconPhone className="h-3.5 w-3.5" />
                        <span>{c.customerMobile}</span>
                      </a>
                    )}
                    {c.orderNumber ? (
                      <span className="rounded-full border border-clay-200 bg-clay-50 px-2.5 py-0.5 text-xs font-bold text-clay-800 dark:border-earth-600 dark:bg-earth-700 dark:text-earth-200">
                        Order #{c.orderNumber}
                      </span>
                    ) : (
                      <span className="rounded-full bg-earth-100 px-2 py-0.5 text-xs font-medium text-earth-600 dark:bg-earth-700 dark:text-earth-300">
                        {lang === "mr" ? "सर्वसाधारण उधारी" : "Account Dues"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-earth-500 dark:text-earth-400">
                    {formatDateTime(c.createdAt, lang)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-earth-400">
                    {lang === "mr" ? "दावा केलेली रक्कम" : "Claimed Amount"}
                  </span>
                  <p className="text-2xl font-black text-leaf-700 dark:text-leaf-400">
                    ₹ {c.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* UTR details & Receipt preview */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-earth-50 p-3 dark:bg-earth-900/60">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-earth-600 dark:text-earth-400">
                    {lang === "mr" ? "UPI UTR / ट्रान्झॅक्शन आयडी:" : "UPI UTR / Txn ID:"}
                  </span>
                  <span className="font-mono font-bold text-earth-900 dark:text-earth-100">
                    {c.upiTxnId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(c.upiTxnId, c.id)}
                    className="rounded-md border border-earth-200 px-1.5 py-0.5 text-[10px] font-semibold text-earth-600 hover:bg-earth-200 dark:border-earth-700 dark:text-earth-300"
                  >
                    {copiedId === c.id ? (lang === "mr" ? "कॉपी झाले" : "Copied") : (lang === "mr" ? "कॉपी" : "Copy")}
                  </button>
                </div>

                {c.receiptImage && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(c.receiptImage || null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-clay-300 bg-clay-50 px-3 py-1.5 text-xs font-bold text-clay-800 shadow-xs hover:bg-clay-100 dark:border-clay-900 dark:bg-clay-950/40 dark:text-clay-300"
                  >
                    <IconCamera className="h-3.5 w-3.5" />
                    <span>{lang === "mr" ? "पावती स्क्रीनशॉट पहा" : "View Receipt"}</span>
                  </button>
                )}
              </div>

              {c.notes && (
                <p className="text-xs text-earth-600 dark:text-earth-300">
                  <span className="font-bold">{lang === "mr" ? "टीप: " : "Note: "}</span>
                  {c.notes}
                </p>
              )}

              {/* Actions */}
              {isRejecting ? (
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-clay-200 bg-clay-50/50 p-3 dark:border-clay-900 dark:bg-clay-950/30">
                  <p className="text-xs font-bold text-clay-900 dark:text-clay-200">
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
                    className="w-full rounded-xl border border-clay-300 px-3 py-2 text-xs font-medium focus:outline-hidden dark:border-clay-800 dark:bg-earth-800 dark:text-earth-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      className="rounded-xl border border-earth-300 px-3 py-1.5 text-xs font-semibold text-earth-600 hover:bg-earth-100 dark:border-earth-700 dark:text-earth-300"
                    >
                      {lang === "mr" ? "रद्द करा" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      disabled={isLoading || !rejectReason.trim()}
                      onClick={() => handleReject(c)}
                      className="rounded-xl bg-clay-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-clay-700 disabled:opacity-50"
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
                    className="min-h-10 rounded-xl border border-earth-300 px-4 text-xs font-bold text-earth-700 hover:bg-earth-100 dark:border-earth-700 dark:text-earth-300 dark:hover:bg-earth-700"
                  >
                    {lang === "mr" ? "नाकारा" : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleApprove(c)}
                    className="min-h-10 rounded-xl bg-leaf-600 px-5 text-xs font-bold text-white shadow-md hover:bg-leaf-700 disabled:opacity-50"
                  >
                    {isLoading
                      ? (lang === "mr" ? "नोंदवत आहे..." : "Processing...")
                      : (lang === "mr" ? "मंजूर करा व जमा नोंदवा" : "Approve & Record Payment")}
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
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-3xl bg-earth-950 p-2 shadow-2xl">
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
