"use client";

import { IconCheck, IconPhone } from "@/components/common/Icons";
import { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n/dict";

/**
 * Slide-over showing how to pay: the mill's UPI QR, a copyable UPI ID, and the
 * confirmation note.
 *
 * Mobile-first. It is a bottom sheet under `sm` and a right-hand panel above it,
 * because on a phone a full-height side panel would be narrower than the QR it
 * has to display.
 *
 * The QR is a plain `<img src="/api/my/payment-qr">` rather than a fetch into
 * state: the browser sends the session cookie on the image request, so the
 * bytes never enter the React tree or the dashboard payload.
 */
export function PaySlideOver({
  open,
  onClose,
  hasUpiQr,
  upiId,
  millPhone,
  onOpenClaimModal,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  hasUpiQr: boolean;
  upiId: string;
  millPhone?: string;
  onOpenClaimModal?: () => void;
  lang: Lang;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  // Escape to close + focus the close button so keyboard users land inside.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    // Stop the page behind the sheet from scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function copyUpiId() {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure origin / denied permission) — the ID is on
      // screen and selectable, so there is nothing to recover from.
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("cust.payTitle", lang)}>
      <button
        type="button"
        aria-label={t("cust.payClose", lang)}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-[var(--border-subtle)] bg-white p-5 pb-8 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0 sm:py-6 dark:border-earth-800 dark:bg-earth-900"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-earth-300 sm:hidden dark:bg-earth-700" />

        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-earth-900 dark:text-earth-100 font-display">
            {t("cust.payTitle", lang)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("cust.payClose", lang)}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-earth-500 hover:bg-earth-100 dark:text-earth-400 dark:hover:bg-earth-800"
          >
            ×
          </button>
        </div>

        {hasUpiQr ? (
          <div className="mt-5 flex flex-col items-center">
            {/* The session cookie rides along on the image request, so this is
                authenticated without any client-side token handling. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/my/payment-qr"
              alt={t("cust.payQrAlt", lang)}
              width={280}
              height={280}
              className="h-auto w-full max-w-[280px] rounded-2xl border border-earth-200 bg-white p-2 dark:border-earth-800"
            />
            {/* Save a copy to the device. A plain link to the same route with
                `?download=1` — no fetch, no base64 round-trip through React, and
                the session cookie is sent like any other request, so the file
                stays as protected as the image on screen. The `download`
                attribute is a hint only; on iOS Safari the long-press
                "Download Linked File" is the fallback, which is why this is a
                real <a> and not a button with a synthetic click. */}
            <a
              href="/api/my/payment-qr?download=1"
              download
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-earth-300 px-4 text-sm font-semibold text-earth-700 hover:bg-earth-50 dark:border-earth-700 dark:text-earth-200 dark:hover:bg-earth-800"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              {t("cust.payDownload", lang)}
            </a>
            <p className="mt-1.5 text-center text-xs text-earth-500 dark:text-earth-400">
              {t("cust.payDownloadHint", lang)}
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-haldi-50 p-4 text-sm font-medium text-haldi-800 dark:bg-haldi-500/10 dark:text-haldi-300">
            {t("cust.payQrMissing", lang)}
          </p>
        )}

        {upiId && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-earth-200 p-3 dark:border-earth-800">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-earth-500 dark:text-earth-400">
                {t("cust.upiId", lang)}
              </p>
              <p className="truncate text-base font-bold text-earth-900 dark:text-earth-100">
                {upiId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyUpiId()}
              className="min-h-11 shrink-0 rounded-xl bg-clay-600 px-4 text-sm font-semibold text-white hover:bg-clay-700"
            >
              {copied ? t("cust.copied", lang) : t("cust.copy", lang)}
            </button>
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-earth-600 dark:text-earth-400">
          {t("cust.payHelp", lang)}
        </p>

        {/* Action Buttons: Report Payment Done & Call Mill Owner */}
        <div className="mt-6 flex flex-col gap-3 border-t border-earth-100 pt-5 dark:border-earth-800">
          {onOpenClaimModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClaimModal();
              }}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-leaf-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-leaf-700 active:scale-[0.99]"
            >
              <IconCheck className="h-4 w-4" />
              <span>
                {lang === "mr" ? "पैसे भरले? पावती / UTR नोंदवा" : "Payment Done? Submit UTR / Receipt"}
              </span>
            </button>
          )}

          {millPhone ? (
            <a
              href={`tel:${millPhone}`}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-clay-300 bg-clay-50/70 px-4 py-2.5 text-sm font-bold text-clay-800 transition-colors hover:bg-clay-100 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300 dark:hover:bg-clay-900/60"
            >
              <IconPhone className="h-4 w-4" />
              <span>
                {lang === "mr" ? "गिरणीला कॉल करा" : "Call Mill Owner"} ({millPhone})
              </span>
            </a>
          ) : (
            <a
              href="tel:9876543210"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-clay-300 bg-clay-50/70 px-4 py-2.5 text-sm font-bold text-clay-800 transition-colors hover:bg-clay-100 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300 dark:hover:bg-clay-900/60"
            >
              <IconPhone className="h-4 w-4" />
              <span>
                {lang === "mr" ? "गिरणीला कॉल करा" : "Call Mill Owner"}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
