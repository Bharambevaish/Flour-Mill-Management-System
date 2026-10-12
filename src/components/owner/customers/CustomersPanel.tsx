"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import { CustomerForm } from "./CustomerForm";
import type { CustomerView } from "@/services/customerService";

export function CustomersPanel({
  initialCustomers,
  lang,
}: {
  initialCustomers: CustomerView[];
  lang: Lang;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? initialCustomers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q),
      )
    : initialCustomers;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(customer: CustomerView) {
    setEditing(customer);
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
  }

  async function toggleActive(customer: CustomerView) {
    setError(null);
    const res = await apiFetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      body: { active: !customer.active },
    });
    if (!res.ok) {
      setError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Operation failed. Please try again."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "mr" ? "शोधा (नाव / मोबाईल क्रमांक)" : "Search by name or mobile number..."}
          aria-label="Search customers"
          className="stitch-input w-full max-w-xs text-sm"
        />
        <button
          type="button"
          onClick={openCreate}
          className="stitch-btn-primary text-sm"
        >
          {lang === "mr" ? "+ नवीन ग्राहक खाते" : "+ Add New Customer"}
        </button>
      </div>

      {error && <p className="text-sm font-medium text-clay-600 dark:text-clay-400">{error}</p>}

      {formOpen && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-earth-800 dark:bg-earth-900">
          <CustomerForm
            customer={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
            lang={lang}
          />
        </div>
      )}

      <div className="flex flex-col divide-y divide-clay-50 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-soft dark:divide-earth-800 dark:border-earth-800 dark:bg-earth-900">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-earth-500 dark:text-earth-400">
            {q
              ? (lang === "mr" ? "काहीही सापडले नाही" : "No matching customers found")
              : (lang === "mr" ? "अजुन एकही ग्राहक नोंदवलेला नाही" : "No registered customers yet")}
          </p>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-clay-50/30 dark:hover:bg-earth-800/40"
            >
              <div className="min-w-0">
                <p className="font-semibold text-earth-900 dark:text-earth-100">{customer.name}</p>
                <p className="text-sm text-earth-500 dark:text-earth-400">
                  {customer.mobile}
                  <span className="mx-1.5 text-earth-300 dark:text-earth-600">·</span>
                  {formatDateTime(customer.createdAt, lang)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {customer.mustChangePin && (
                  <span className="rounded-full bg-haldi-50 border border-haldi-200 px-2.5 py-0.5 text-xs font-semibold text-haldi-800 dark:bg-haldi-400/10 dark:text-haldi-200 dark:border-haldi-400/20">
                    {lang === "mr" ? "पिन बदलावा लागेल" : "PIN Change Pending"}
                  </span>
                )}
                <span
                  className={
                    customer.active
                      ? "rounded-full bg-leaf-50 border border-leaf-200 px-2.5 py-0.5 text-xs font-semibold text-leaf-800 dark:bg-leaf-400/10 dark:text-leaf-300 dark:border-leaf-400/20"
                      : "rounded-full bg-earth-100 border border-earth-200 px-2.5 py-0.5 text-xs font-semibold text-earth-600 dark:bg-earth-700 dark:text-earth-300 dark:border-earth-600"
                  }
                >
                  {customer.active
                    ? (lang === "mr" ? "सक्रिय" : "Active")
                    : (lang === "mr" ? "निष्क्रिय" : "Inactive")}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(customer)}
                  className="stitch-btn-secondary text-xs"
                >
                  {lang === "mr" ? "बदला" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(customer)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    customer.active
                      ? "border-clay-200 text-clay-700 hover:bg-clay-50 dark:border-clay-500/40 dark:text-clay-300 dark:hover:bg-clay-500/10"
                      : "border-earth-300 text-earth-700 hover:bg-earth-100 dark:border-earth-700 dark:text-earth-300 dark:hover:bg-earth-800"
                  }`}
                >
                  {customer.active
                    ? (lang === "mr" ? "निष्क्रिय करा" : "Deactivate")
                    : (lang === "mr" ? "सुरू करा" : "Activate")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}