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
      <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
        {lang === "mr" ? "जलद क्रिया" : "Quick Actions"}
      </h2>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/owner/new-order"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {lang === "mr" ? "+ नवीन ऑर्डर" : "+ New Order"}
        </Link>
        <Link
          href="/owner/queue"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {lang === "mr" ? "दळण्याची यादी" : "Milling Queue"}
        </Link>
        <Link
          href="/owner/outstanding"
          className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          {lang === "mr" ? "उधारी वसूल करा" : "Collect Dues"}
        </Link>
        <Link
          href="/owner/payments"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {lang === "mr" ? "पेमेंट नोंदी" : "Payment Ledger"}
        </Link>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {lang === "mr" ? "+ ग्राहक जोडा" : "+ Add Customer"}
        </button>
      </div>

      {formOpen && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <CustomerForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </section>
  );
}