"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/common";
import { OrderStatusLine } from "@/components/customer/OrderStatusLine";
import { OrderStatusTimes } from "@/components/customer/OrderStatusTimes";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { formatDateTime } from "@/lib/i18n/format";
import { t, type Lang } from "@/lib/i18n/dict";
import type { OrderView } from "@/services/orderService";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

/**
 * The customer's list of orders, designed mobile-first: one column, generous
 * padding, a single money line that answers "what do I owe on this", and a
 * single "Details" tap that reveals both the payment history and the step-by-step
 * timestamps.
 *
 * The previous version stacked six blocks per card — token row, a grain line, a
 * three-across Total/Paid/Due row, a 4-dot progress bar, a "Currently:" caption
 * and its own separate "View times" toggle. On a 375 px screen that read as a
 * wall of numbers, so the three money figures collapsed to one and the
 * timestamps moved behind the same expander as the payments.
 */
export function CustomerOrdersPanel({
  orders,
  lang,
}: {
  orders: OrderView[];
  lang: Lang;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-rose-200 bg-white/60 p-10 text-center shadow-soft dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-base font-medium text-zinc-600 dark:text-zinc-400">
          {t("cust.ordersEmpty", lang)}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
          {t("cust.myOrders", lang)}
        </h2>
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {orders.length} {t("cust.orderCount", lang)}
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {orders.map((o) => {
          const open = openId === o.id;
          const cancelled = o.status === "cancelled";

          return (
            <li
              key={o.id}
              className={`rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900 ${
                cancelled ? "opacity-80" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-sm font-semibold text-rose-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    #{o.orderId}
                  </span>
                  <StatusBadge status={o.status} lang={lang} />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTime(o.createdAt, lang)}
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {grainLabel(o.grainType, lang)} · {sizeLabel(o.requiredSize, lang)} · {o.weightKg} kg · ₹
                {o.ratePerKg}/kg
              </p>

              <OrderStatusLine status={o.status} lang={lang} />

              {/* The one money line that matters on a phone. */}
              <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                {cancelled ? (
                  o.refundDue > 0 ? (
                    <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                      {t("cust.refundNote", lang)} {money(o.refundDue)}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {t("order.noRefund", lang)}
                    </p>
                  )
                ) : o.outstanding > 0 ? (
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                    {t("cust.due", lang)} {money(o.outstanding)}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {t("cust.paidInFull", lang)}
                  </p>
                )}
              </div>

              {cancelled && (o.cancelReason || o.cancelledAt) && (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("cust.cancelledOn", lang)}
                  {o.cancelledAt ? ` ${formatDateTime(o.cancelledAt, lang)}` : ""}
                  {o.cancelReason ? ` · ${o.cancelReason}` : ""}
                </p>
              )}

              <button
                type="button"
                onClick={() => setOpenId(open ? null : o.id)}
                aria-expanded={open}
                className="mt-3 min-h-11 text-sm font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
              >
                {t("cust.details", lang)} ({o.payments.length}) {open ? "−" : "+"}
              </button>

              {open && (
                <div className="mt-1 flex flex-col gap-4 rounded-xl border border-rose-100 bg-rose-50/20 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div>
                    <dl className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-zinc-600 dark:text-zinc-400">{t("cust.total", lang)}</dt>
                        <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {money(o.totalCharges)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-zinc-600 dark:text-zinc-400">{t("cust.paid", lang)}</dt>
                        <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {money(o.paidAmount)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t("cust.paymentHistory", lang)}
                    </p>
                    {o.payments.length === 0 ? (
                      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {t("cust.noPayments", lang)}
                      </p>
                    ) : (
                      <ul className="mt-1.5 flex flex-col gap-2">
                        {o.payments.map((p) => (
                          <li
                            key={p.recordedAt}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {p.method === "upi" ? "UPI" : lang === "mr" ? "रोख" : "Cash"}
                              {p.upiTxnId && (
                                <span className="ml-1 text-zinc-400">· {p.upiTxnId}</span>
                              )}
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="text-xs text-zinc-400">
                                {formatDateTime(p.recordedAt, lang)}
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

                  <OrderStatusTimes order={o} lang={lang} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
