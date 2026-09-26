"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerForm } from "@/components/owner/customers";

function useLang(): "mr" | "en" {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    if (match && (match[1] === "mr" || match[1] === "en")) {
      return match[1];
    }
  }
  return "en";
}

export function DashboardQuickActions() {
  const [formOpen, setFormOpen] = useState(false);
  const lang = useLang();

  return (
    <section>
      <h2 className="mb-3.5 text-base font-bold text-[#4c0519] dark:text-zinc-100">
        {lang === "mr" ? "जलद क्रिया" : "Quick Actions"}
      </h2>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/owner/new-order"
          className="stitch-btn-primary px-4 py-2.5 text-sm"
        >
          {lang === "mr" ? "+ नवीन ऑर्डर" : "+ New Order"}
        </Link>
        <Link
          href="/owner/queue"
          className="stitch-btn-primary px-4 py-2.5 text-sm"
        >
          {lang === "mr" ? "दळण्याची यादी" : "Milling Queue"}
        </Link>
        <Link
          href="/owner/outstanding"
          className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-2.5 text-sm font-semibold text-rose-900 shadow-xs transition-all hover:bg-rose-100/90 hover:border-rose-300 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {lang === "mr" ? "उधारी वसूल करा" : "Collect Dues"}
        </Link>
        <Link
          href="/owner/payments"
          className="stitch-btn-secondary px-4 py-2.5 text-sm"
        >
          {lang === "mr" ? "पेमेंट नोंदी" : "Payment Ledger"}
        </Link>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="stitch-btn-secondary px-4 py-2.5 text-sm cursor-pointer"
        >
          {lang === "mr" ? "+ ग्राहक जोडा" : "+ Add Customer"}
        </button>
      </div>

      {formOpen && (
        <div className="stitch-card mt-4 p-5">
          <CustomerForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </section>
  );
}