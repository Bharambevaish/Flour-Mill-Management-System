"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { CustomerForm } from "./CustomerForm";
import type { CustomerView } from "@/services/customerService";

function useLang(): "mr" | "en" {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    if (match && (match[1] === "mr" || match[1] === "en")) {
      return match[1];
    }
  }
  return "en";
}

export function CustomersPanel({ initialCustomers }: { initialCustomers: CustomerView[] }) {
  const router = useRouter();
  const lang = useLang();
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

      {error && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}

      {formOpen && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <CustomerForm
            customer={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        </div>
      )}

      <div className="flex flex-col divide-y divide-rose-50 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-soft dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {q
              ? (lang === "mr" ? "काहीही सापडले नाही" : "No matching customers found")
              : (lang === "mr" ? "अजुन एकही ग्राहक नोंदवलेला नाही" : "No registered customers yet")}
          </p>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-rose-50/30 dark:hover:bg-zinc-800/40"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{customer.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {customer.mobile}
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                  {new Date(customer.createdAt).toLocaleDateString(lang === "mr" ? "mr-IN" : "en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {customer.mustChangePin && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/20">
                    {lang === "mr" ? "पिन बदलावा लागेल" : "PIN Change Pending"}
                  </span>
                )}
                <span
                  className={
                    customer.active
                      ? "rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20"
                      : "rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600"
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
                      ? "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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