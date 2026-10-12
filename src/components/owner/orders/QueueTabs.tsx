"use client";

import { useState } from "react";
import { PaymentsPanel } from "@/components/owner/payments/PaymentsPanel";
import { QueuePanel } from "@/components/owner/orders";
import { type Lang } from "@/lib/i18n/format";
import type { CustomerView } from "@/services/customerService";
import type { OrderView } from "@/services/orderService";

/**
 * The Queue page's two views.
 *
 * Cancelled orders are a tab here rather than their own nav item on purpose:
 * they are not work to be done, but they ARE the mill's record of money it is
 * holding (a paid order that got cancelled shows its refund due), and burying
 * that under Payments/Outstanding would hide the one place the owner needs to
 * act on it. The two datasets come pre-filtered from the server so switching
 * tabs costs no round trip and can't leak a status the caller didn't ask for.
 */
export function QueueTabs({
  liveOrders,
  cancelledOrders,
  customers,
  defaultRates,
  lang,
}: {
  liveOrders: OrderView[];
  cancelledOrders: OrderView[];
  customers: CustomerView[];
  defaultRates: Record<string, Record<string, number>>;
  lang: Lang;
}) {
  const [tab, setTab] = useState<"live" | "cancelled">("live");

  const refundTotal = cancelledOrders.reduce((sum, o) => sum + o.refundDue, 0);

  const tabClass = (id: "live" | "cancelled") =>
    `min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
      tab === id
        ? "bg-earth-900 text-white dark:bg-earth-100 dark:text-earth-900"
        : "bg-white text-earth-700 hover:bg-earth-50 dark:bg-earth-900 dark:text-earth-300 dark:hover:bg-earth-800"
    }`;

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile-friendly tab strip: full-width stacked buttons under sm. */}
      <div className="no-print flex flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-soft sm:flex-row dark:border-earth-800 dark:bg-earth-900">
        <button type="button" onClick={() => setTab("live")} className={tabClass("live")}>
          {lang === "mr" ? "१. सध्याची रांग" : "1. Live queue"}
          <span className="ml-1.5 opacity-70">({liveOrders.length})</span>
        </button>
        <button type="button" onClick={() => setTab("cancelled")} className={tabClass("cancelled")}>
          {lang === "mr" ? "२. रद्द केलेले" : "2. Cancelled"}
          <span className="ml-1.5 opacity-70">({cancelledOrders.length})</span>
          {refundTotal > 0 && (
            <span className="ml-1.5 rounded-full bg-haldi-500/20 px-2 py-0.5 text-xs font-bold text-haldi-700 dark:text-haldi-300">
              {lang === "mr"
                ? `परत ₹${refundTotal.toLocaleString("en-IN")}`
                : `refund ₹${refundTotal.toLocaleString("en-IN")}`}
            </span>
          )}
        </button>
      </div>

      {tab === "live" ? (
        <QueuePanel
          orders={liveOrders}
          customers={customers}
          defaultRates={defaultRates}
          lang={lang}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-earth-600 dark:text-earth-400">
            {lang === "mr"
              ? "रद्द केलेले ऑर्डर इतिहास म्हणून जतन केले जातात. जमा रक्कम दिसते, पण नवीन पेमेंट नोंदवता येत नाही."
              : "Cancelled orders are kept as history. Any money already collected is still shown, but no new payment can be recorded."}
          </p>
          <PaymentsPanel orders={cancelledOrders} lang={lang} cancelledOnly />
        </div>
      )}
    </div>
  );
}
