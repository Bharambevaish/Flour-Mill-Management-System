"use client";

import type { Lang } from "@/lib/i18n/i18n";
import type { PaymentMethod } from "@/models/Order";

function useLang(): "mr" | "en" {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    if (match && (match[1] === "mr" || match[1] === "en")) {
      return match[1];
    }
  }
  return "en";
}

export function PaymentEntry({
  amount,
  onAmountChange,
  method,
  onMethodChange,
  upiTxnId,
  onUpiTxnIdChange,
  max,
  heading,
  lang: langProp,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  upiTxnId: string;
  onUpiTxnIdChange: (value: string) => void;
  max: number;
  heading?: string;
  lang?: Lang;
}) {
  const detected = useLang();
  const lang = langProp ?? detected;
  const title = heading ?? (lang === "mr" ? "पेमेंट नोंद" : "Payment Receipt");
  const inputClass =
    "w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400";

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
        {max > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {lang === "mr" ? `जास्तीत जास्त ₹ ${max.toLocaleString("en-IN")}` : `Max allowed ₹ ${max.toLocaleString("en-IN")}`}
          </p>
        )}
      </div>

      <div>
        <label className="mb-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
          {lang === "mr" ? "रक्कम (₹)" : "Amount (₹)"}
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="1"
          max={max > 0 ? max : undefined}
          step="1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
          {lang === "mr" ? "पेमेंट पद्धत" : "Payment Method"}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMethodChange("cash")}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              method === "cash"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {lang === "mr" ? "रोख (Cash)" : "Cash"}
          </button>
          <button
            type="button"
            onClick={() => onMethodChange("upi")}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              method === "upi"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            UPI
          </button>
        </div>
      </div>

      {method === "upi" && (
        <div>
          <label className="mb-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            {lang === "mr" ? "UPI ट्रान्सॅक्शन आयडी (Transaction ID)" : "UPI Transaction ID"}
          </label>
          <input
            type="text"
            value={upiTxnId}
            onChange={(e) => onUpiTxnIdChange(e.target.value)}
            placeholder="e.g. DF82A1BC3E94X9"
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}