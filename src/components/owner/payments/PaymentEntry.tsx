"use client";

import type { Lang } from "@/lib/i18n/i18n";
import type { PaymentMethod } from "@/models/Order";

export function PaymentEntry({
  amount,
  onAmountChange,
  method,
  onMethodChange,
  upiTxnId,
  onUpiTxnIdChange,
  max,
  heading,
  lang,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  upiTxnId: string;
  onUpiTxnIdChange: (value: string) => void;
  max: number;
  heading?: string;
  lang: Lang;
}) {
  const title = heading ?? (lang === "mr" ? "पेमेंट नोंद" : "Payment Receipt");
  const inputClass = "stitch-input w-full";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#805e68] dark:text-zinc-400">{title}</p>
        {max > 0 && (
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            {lang === "mr" ? `जास्तीत जास्त ₹ ${max.toLocaleString("en-IN")}` : `Max allowed ₹ ${max.toLocaleString("en-IN")}`}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b545a] dark:text-zinc-400">
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
        <label className="mb-1 block text-xs font-semibold text-[#6b545a] dark:text-zinc-400">
          {lang === "mr" ? "पेमेंट पद्धत" : "Payment Method"}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMethodChange("cash")}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
              method === "cash"
                ? "border-rose-400 bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-rose-200/80 bg-white text-rose-900 shadow-xs hover:bg-rose-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {lang === "mr" ? "रोख (Cash)" : "Cash"}
          </button>
          <button
            type="button"
            onClick={() => onMethodChange("upi")}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
              method === "upi"
                ? "border-rose-400 bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-rose-200/80 bg-white text-rose-900 shadow-xs hover:bg-rose-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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