"use client";

import { useState } from "react";
import { LanguageToggle, LogoutButton, BrandMark, IconPhone, IconArrowRight, IconCheck } from "@/components/common";
import { CustomerNotificationsPanel } from "@/components/customer/CustomerNotificationsPanel";
import { CustomerOrdersPanel } from "@/components/customer/CustomerOrdersPanel";
import { PaySlideOver } from "@/components/customer/PaySlideOver";
import { PaymentClaimModal } from "@/components/customer/PaymentClaimModal";
import { t, type Lang } from "@/lib/i18n/dict";
import type { CustomerDashboardView } from "@/services/customerDashboardService";

const money = (n: number): string => n.toLocaleString("en-IN");

export function CustomerPortal({
  dash,
  lang,
}: {
  dash: CustomerDashboardView;
  lang: Lang;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimOrderId, setClaimOrderId] = useState<string | null>(null);

  const dueZero = dash.outstandingTotal <= 0;
  const millPhone = dash.payment.millPhone || "9876543210";
  const ready = dash.orders.filter((o) => o.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9 shrink-0" />
            <span className="truncate text-[15px] font-bold leading-tight text-heading">
              {lang === "mr" ? "माझी गिरणी" : "My Mill"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle initialLang={lang} />
            <LogoutButton lang={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <p className="text-sm font-medium text-muted">{t("cust.hello", lang)},</p>
        <h1 className="mt-0.5 text-[28px] leading-tight text-heading">{dash.customer.name}</h1>

        {/* Ledger card: the one number that matters. */}
        {dueZero ? (
          <section className="mt-5 overflow-hidden rounded-2xl bg-leaf-700 text-white shadow-elevated dark:bg-leaf-800">
            <div className="straw flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                <IconCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-2xl leading-tight">{t("cust.allClear", lang)}</p>
                <p className="mt-0.5 text-sm text-leaf-100">{t("cust.allClearBody", lang)}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-5 overflow-hidden rounded-2xl bg-clay-700 text-white shadow-elevated dark:bg-clay-800">
            <div className="straw p-5">
              <p className="text-sm font-semibold text-clay-100">{t("cust.whatYouOwe", lang)}</p>
              <p className="mt-1 font-display text-[44px] leading-none tracking-tight">
                <span className="mr-1 text-[30px] text-clay-200">₹</span>
                {money(dash.outstandingTotal)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  aria-haspopup="dialog"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-clay-800 shadow-sm transition-transform active:translate-y-px"
                >
                  {t("cust.payNow", lang)}
                  <IconArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={`tel:${millPhone}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white ring-1 ring-white/35 transition-colors hover:bg-white/10"
                >
                  <IconPhone className="h-4 w-4" />
                  {t("cust.callMill", lang)}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* The moment the customer opened the app for. */}
        {ready.length > 0 && (
          <section className="mt-4 flex items-start gap-3 rounded-2xl border border-leaf-200 bg-leaf-50 p-4 dark:border-leaf-800 dark:bg-leaf-950/60">
            <span className="relative mt-1 flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-500 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-leaf-600" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-leaf-800 dark:text-leaf-300">{t("cust.readyTitle", lang)}</p>
              <p className="mt-0.5 text-sm text-leaf-800/80 dark:text-leaf-300/80">
                {ready.map((o) => `#${o.orderId}`).join(", ")} · {t("cust.readyBody", lang)}
              </p>
            </div>
          </section>
        )}

        {/* Two quiet counters */}
        <dl className="mt-4 grid grid-cols-2 divide-x divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-surface">
          <div className="px-4 py-3">
            <dt className="text-xs font-semibold text-muted">{t("cust.activeOrders", lang)}</dt>
            <dd className="mt-0.5 font-display text-2xl text-heading">{dash.activeOrderCount}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="text-xs font-semibold text-muted">{t("cust.unread", lang)}</dt>
            <dd className={`mt-0.5 font-display text-2xl ${dash.unreadCount > 0 ? "text-clay-700 dark:text-clay-400" : "text-heading"}`}>
              {dash.unreadCount}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col gap-8">
          <CustomerOrdersPanel
            orders={dash.orders}
            lang={lang}
            millPhone={millPhone}
            pendingClaims={dash.pendingClaims}
            onOpenClaimForOrder={(orderId) => {
              setClaimOrderId(orderId);
              setClaimModalOpen(true);
            }}
          />
          <CustomerNotificationsPanel notifications={dash.notifications} lang={lang} />
        </div>
      </main>

      <PaySlideOver
        open={payOpen}
        onClose={() => setPayOpen(false)}
        hasUpiQr={dash.payment.hasUpiQr}
        upiId={dash.payment.upiId}
        millPhone={millPhone}
        onOpenClaimModal={() => {
          setClaimOrderId(null);
          setClaimModalOpen(true);
        }}
        lang={lang}
      />

      {claimModalOpen && (
        <PaymentClaimModal
          orders={dash.orders}
          preselectedOrderId={claimOrderId}
          lang={lang}
          onClose={() => {
            setClaimModalOpen(false);
            setClaimOrderId(null);
          }}
        />
      )}
    </div>
  );
}
