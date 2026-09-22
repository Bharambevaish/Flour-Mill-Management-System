"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/common";
import { OrderProgress } from "@/components/customer/OrderProgress";
import { grainLabel, sizeLabel } from "@/lib/millings";
import type { OrderView } from "@/services/orderService";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

export function CustomerOrdersPanel({
  orders,
  lang,
}: {
  orders: OrderView[];
  lang: "mr" | "en";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const mr = lang === "mr";
  const locale = mr ? "mr-IN" : "en-IN";

  if (orders.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {mr ? "अजून कोणतीही दळण ऑर्डर नाही." : "No milling orders yet."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {mr ? "माझ्या ऑर्डर्स" : "My Milling Orders"}
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {orders.length} {mr ? "ऑर्डर" : "order" + (orders.length === 1 ? "" : "s")}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {orders.map((o) => {
          const open = openId === o.id;
          return (
            <li
              key={o.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    #{o.orderId}
                  </span>
                  <StatusBadge status={o.status} lang={lang} />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(o.createdAt).toLocaleString(locale, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {grainLabel(o.grainType, lang)} · {sizeLabel(o.requiredSize, lang)} · {o.weightKg} kg · ₹
                {o.ratePerKg}/kg
              </p>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {mr ? "एकूण ₹ " : "Total ₹ "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {money(o.totalCharges)}
                  </span>
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {mr ? "जमा ₹ " : "Paid ₹ "}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {money(o.paidAmount)}
                  </span>
                </span>
                {o.outstanding > 0 ? (
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    {mr ? "बाकी ₹ " : "Due ₹ "}
                    {money(o.outstanding)}
                  </span>
                ) : (
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {mr ? "पैसे पूर्ण" : "Paid in full"}
                  </span>
                )}
              </div>

              <OrderProgress order={o} lang={lang} />

              <button
                type="button"
                onClick={() => setOpenId(open ? null : o.id)}
                className="mt-3 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {mr ? "जमा रकमेचा इतिहास" : "Payment History"} ({o.payments.length})
                {open ? " −" : " +"}
              </button>

              {open && (
                <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  {o.payments.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {mr ? "अजून कोणतीही जमा रक्कम नाही." : "No payments recorded yet."}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {o.payments.map((p) => (
                        <li
                          key={p.recordedAt}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {p.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                            {p.upiTxnId && (
                              <span className="ml-1 text-zinc-400">· {p.upiTxnId}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400">
                              {new Date(p.recordedAt).toLocaleString(locale, {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {money(p.amount)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}