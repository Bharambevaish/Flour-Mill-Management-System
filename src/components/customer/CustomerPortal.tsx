"use client";

import { useState } from "react";
import { LanguageToggle, LogoutButton } from "@/components/common";
import { CustomerNotificationsPanel } from "@/components/customer/CustomerNotificationsPanel";
import { CustomerOrdersPanel } from "@/components/customer/CustomerOrdersPanel";
import { PaySlideOver } from "@/components/customer/PaySlideOver";
import { PaymentClaimModal } from "@/components/customer/PaymentClaimModal";
import { t, type Lang } from "@/lib/i18n/dict";
import type { CustomerDashboardView } from "@/services/customerDashboardService";

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

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 font-sans sm:px-6 dark:bg-zinc-950">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
            {t("cust.hello", lang)}, {dash.customer.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t("cust.track", lang)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Call Button to Mill Owner */}
          <a
            href={`tel:${millPhone}`}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-800 shadow-xs transition-colors hover:bg-rose-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-300"
            title={lang === "mr" ? `गिरणीला कॉल करा (${millPhone})` : `Call Mill Owner (${millPhone})`}
          >
            <span>📞</span>
            <span>{lang === "mr" ? "कॉल करा" : "Call Mill"}</span>
          </a>
          <LanguageToggle initialLang={lang} />
          <LogoutButton lang={lang} />
        </div>
      </header>

      {/* Hero: what you owe. Tappable → pay panel. */}
      <button
        type="button"
        onClick={() => setPayOpen(true)}
        aria-haspopup="dialog"
        className={`flex w-full flex-col items-start gap-1 rounded-2xl border p-5 text-left shadow-soft transition-transform active:scale-[0.99] ${
          dueZero
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10"
            : "border-rose-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <span className="text-base font-semibold text-zinc-600 dark:text-zinc-400">
          {t("cust.whatYouOwe", lang)}
        </span>
        <span
          className={`text-4xl font-bold font-[family-name:var(--font-plus-jakarta)] ${
            dueZero ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
          }`}
        >
          ₹ {dash.outstandingTotal.toLocaleString("en-IN")}
        </span>
        {!dueZero && (
          <span className="mt-0.5 text-sm font-semibold text-rose-700 dark:text-rose-400">
            {t("cust.tapToPay", lang)} →
          </span>
        )}
      </button>

      {/* Secondary counts, side by side */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 text-center shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold font-[family-name:var(--font-plus-jakarta)] text-zinc-900 dark:text-zinc-100">
            {dash.activeOrderCount}
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t("cust.activeOrders", lang)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 text-center shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <p
            className={`text-2xl font-bold font-[family-name:var(--font-plus-jakarta)] ${
              dash.unreadCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {dash.unreadCount}
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t("cust.unread", lang)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
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
    </main>
  );
}
