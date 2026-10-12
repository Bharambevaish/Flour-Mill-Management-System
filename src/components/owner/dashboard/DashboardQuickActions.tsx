"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerForm } from "@/components/owner/customers";
import type { Lang } from "@/lib/i18n/i18n";

export function DashboardQuickActions({ lang }: { lang: Lang }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section>
      <h2 className="mb-3 text-lg text-heading">
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
          className="stitch-btn-secondary px-4 py-2.5 text-sm"
        >
          {lang === "mr" ? "दळण्याची यादी" : "Milling Queue"}
        </Link>
        <Link
          href="/owner/outstanding"
          className="stitch-btn-secondary px-4 py-2.5 text-sm"
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
          <CustomerForm onDone={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} lang={lang} />
        </div>
      )}
    </section>
  );
}