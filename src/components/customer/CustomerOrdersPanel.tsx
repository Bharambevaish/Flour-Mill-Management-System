"use client";

import { useState } from "react";
import { StatusBadge, IconPhone, IconCheck, IconClock, IconChevron } from "@/components/common";
import { OrderStatusLine } from "@/components/customer/OrderStatusLine";
import { OrderStatusTimes } from "@/components/customer/OrderStatusTimes";
import { grainLabel, sizeLabel } from "@/lib/millings";
import { formatDateTime } from "@/lib/i18n/format";
import { t, type Lang } from "@/lib/i18n/dict";
import type { OrderView } from "@/services/orderService";

import type { PaymentClaimView } from "@/services/paymentClaimService";

const money = (n: number): string => `₹ ${n.toLocaleString("en-IN")}`;

type Props = {
  orders: OrderView[];
  lang: Lang;
  millPhone?: string;
  pendingClaims?: PaymentClaimView[];
  onOpenClaimForOrder?: (orderId: string) => void;
};

/**
 * The customer's orders as paper slips — the same slip the mill used to hand
 * over at the counter. Current orders first; collected and cancelled ones move
 * to "Past orders" so the screen opens on what is still happening.
 */
export function CustomerOrdersPanel({ orders, lang, millPhone, pendingClaims = [], onOpenClaimForOrder }: Props) {
  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
        <p className="font-display text-xl text-heading">{t("cust.myOrders", lang)}</p>
        <p className="mt-1 text-sm text-muted">{t("cust.ordersEmpty", lang)}</p>
      </section>
    );
  }

  const isPast = (o: OrderView) => o.status === "collected" || o.status === "cancelled";
  // Past orders that still carry a balance stay up top: they need attention.
  const current = orders.filter((o) => !isPast(o) || o.outstanding > 0);
  const past = orders.filter((o) => isPast(o) && o.outstanding <= 0);

  const slip = (o: OrderView) => (
    <OrderSlip
      key={o.id}
      order={o}
      lang={lang}
      millPhone={millPhone}
      pendingClaim={pendingClaims.find(
        (c) => (c.orderId === o.id || c.orderNumber === o.orderId) && c.status === "pending",
      )}
      onOpenClaim={onOpenClaimForOrder}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionHead title={t("cust.currentOrders", lang)} count={current.length} />
        {current.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-5 py-8 text-center text-sm text-muted">
            {t("cust.noCurrent", lang)}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">{current.map(slip)}</ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <SectionHead title={t("cust.oldOrders", lang)} count={past.length} />
          <ul className="flex flex-col gap-4">{past.map(slip)}</ul>
        </section>
      )}
    </div>
  );
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-xl text-heading">{title}</h2>
      <span className="text-sm font-semibold text-muted">{count}</span>
    </div>
  );
}

function OrderSlip({
  order: o,
  lang,
  millPhone,
  pendingClaim,
  onOpenClaim,
}: {
  order: OrderView;
  lang: Lang;
  millPhone?: string;
  pendingClaim?: PaymentClaimView;
  onOpenClaim?: (orderId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cancelled = o.status === "cancelled";
  const mr = lang === "mr";

  return (
    <li
      className={`overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-soft ${
        cancelled ? "opacity-75" : ""
      }`}
    >
      {/* Head: token + what was milled */}
      <div className="p-4 pb-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-clay-300 text-clay-700 dark:border-clay-800 dark:text-clay-400">
            <span className="text-[10px] font-semibold leading-none opacity-80">{mr ? "क्र." : "No."}</span>
            <span className="font-display text-xl leading-none">{o.orderId}</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-lg font-bold leading-tight text-heading">{grainLabel(o.grainType, lang)}</p>
              <StatusBadge status={o.status} lang={lang} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {sizeLabel(o.requiredSize, lang)} · {o.weightKg} kg · ₹{o.ratePerKg}/kg
            </p>
            <p className="mt-0.5 text-xs text-earth-500 dark:text-earth-400">{formatDateTime(o.createdAt, lang)}</p>
          </div>
        </div>

        <OrderStatusLine status={o.status} lang={lang} />
      </div>

      {/* Tear line, then the money */}
      <div className="slip-tear mx-0 px-4 pb-4 pt-4 sm:px-5">
        {cancelled ? (
          <>
            {o.refundDue > 0 ? (
              <p className="text-base font-bold text-haldi-700 dark:text-haldi-300">
                {t("cust.refundNote", lang)} {money(o.refundDue)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted">{t("order.noRefund", lang)}</p>
            )}
            {(o.cancelReason || o.cancelledAt) && (
              <p className="mt-1 text-sm text-muted">
                {t("cust.cancelledOn", lang)}
                {o.cancelledAt ? ` ${formatDateTime(o.cancelledAt, lang)}` : ""}
                {o.cancelReason ? ` · ${o.cancelReason}` : ""}
              </p>
            )}
          </>
        ) : o.outstanding > 0 ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">{t("cust.due", lang)}</p>
              <p className="font-display text-[28px] leading-none text-clay-700 dark:text-clay-400">{money(o.outstanding)}</p>
              <p className="mt-1 text-xs text-muted">
                {t("cust.total", lang)} {money(o.totalCharges)} · {t("cust.paid", lang)} {money(o.paidAmount)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendingClaim ? (
                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-haldi-100 px-3 text-xs font-bold text-haldi-800 dark:bg-haldi-950 dark:text-haldi-300">
                  <IconClock className="h-3.5 w-3.5" />
                  {t("cust.verifying", lang)}
                </span>
              ) : (
                onOpenClaim && (
                  <button
                    type="button"
                    onClick={() => onOpenClaim(o.id)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-leaf-600 px-3.5 text-sm font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition-colors hover:bg-leaf-700 active:translate-y-px"
                  >
                    <IconCheck className="h-4 w-4" />
                    {t("cust.paidQ", lang)}
                  </button>
                )
              )}
              <a
                href={`tel:${millPhone || "9876543210"}`}
                aria-label={t("cust.callMill", lang)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-strong)] text-clay-700 hover:bg-clay-50 dark:text-clay-400 dark:hover:bg-earth-800"
              >
                <IconPhone className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {t("cust.total", lang)} <span className="font-semibold text-heading">{money(o.totalCharges)}</span>
            </p>
            <span className="paid-stamp text-sm text-leaf-700 dark:text-leaf-400">{t("cust.paidInFull", lang)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-clay-700 hover:text-clay-800 dark:text-clay-400 dark:hover:text-clay-300"
        >
          {t("cust.details", lang)}
          {o.payments.length > 0 && <span className="text-muted">({o.payments.length})</span>}
          <IconChevron className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-2 flex flex-col gap-4 rounded-xl bg-earth-100/70 p-4 dark:bg-earth-950/70">
            <div>
              <p className="text-xs font-bold text-muted">{t("cust.paymentHistory", lang)}</p>
              {o.payments.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted">{t("cust.noPayments", lang)}</p>
              ) : (
                <ul className="mt-1.5 flex flex-col divide-y divide-dashed divide-[var(--border-strong)]">
                  {o.payments.map((p) => (
                    <li key={p.recordedAt} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                      <span className="text-earth-700 dark:text-earth-300">
                        {p.method === "upi" ? "UPI" : mr ? "रोख" : "Cash"}
                        {p.upiTxnId && <span className="ml-1 font-mono text-xs text-earth-500">· {p.upiTxnId}</span>}
                        <span className="block text-xs text-earth-500 dark:text-earth-400">{formatDateTime(p.recordedAt, lang)}</span>
                      </span>
                      <span className="font-semibold text-leaf-700 dark:text-leaf-400">+ {money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <OrderStatusTimes order={o} lang={lang} />
          </div>
        )}
      </div>
    </li>
  );
}
