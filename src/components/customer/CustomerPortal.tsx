"use client";

import { useState } from "react";
import { LanguageToggle, LogoutButton } from "@/components/common";
import { CustomerNotificationsPanel } from "@/components/customer/CustomerNotificationsPanel";
import { CustomerOrdersPanel } from "@/components/customer/CustomerOrdersPanel";
import { PaySlideOver } from "@/components/customer/PaySlideOver";
import { t, type Lang } from "@/lib/i18n/dict";
import type { CustomerDashboardView } from "@/services/customerDashboardService";

/**
 * The customer portal, designed for a phone held in one hand.
 *
 * Order of the screen is deliberate: what do I owe (tappable, the single most
 * important thing) → the two small counts → my orders → alerts last. The previous
 * layout put three equal-weight stat cards up top and the orders below
 * notifications, so a customer had to scroll past everything before reaching the
 * thing they opened the app for.
 *
 * `pb-28` clears the root layout's fixed theme button, which is pinned to the
 * bottom-right and would otherwise sit on top of the last order card.
 */
export function CustomerPortal({
  dash,
  lang,
}: {
  dash: CustomerDashboardView;
  lang: Lang;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const dueZero = dash.outstandingTotal <= 0;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-5 font-sans sm:px-6 dark:bg-zinc-950">
      <header className="mb-5 flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
            {t("cust.hello", lang)}, {dash.customer.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t("cust.track", lang)}</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Secondary counts, side by side — saves a full card of scrolling. */}
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
        <CustomerOrdersPanel orders={dash.orders} lang={lang} />
        <CustomerNotificationsPanel notifications={dash.notifications} lang={lang} />
      </div>

      <PaySlideOver
        open={payOpen}
        onClose={() => setPayOpen(false)}
        hasUpiQr={dash.payment.hasUpiQr}
        upiId={dash.payment.upiId}
        lang={lang}
      />
    </main>
  );
}
