"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { DEFAULT_RATES, grainKeyOf, grainLabel, GRAINS, sizeKeyOf, sizeLabel, SIZES, type GrainKey, type SizeKey } from "@/lib/millings";
import { StatusBadge } from "@/components/common";
import { OrderActionModal } from "./OrderActionModal";
import type { CustomerView } from "@/services/customerService";
import type { OrderView } from "@/services/orderService";
import type { OrderStatus } from "@/models/Order";

function useLang(): "mr" | "en" {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    if (match && (match[1] === "mr" || match[1] === "en")) {
      return match[1];
    }
  }
  return "en";
}

const ADVANCE: Partial<Record<OrderStatus, { mr: string; en: string; to: OrderStatus }>> = {
  pending: { mr: "दळण्यास सुरू करा", en: "Start Milling", to: "processing" },
  processing: { mr: "तयार झाले", en: "Mark Ready", to: "completed" },
  completed: { mr: "घेतला", en: "Mark Collected", to: "collected" },
};

interface EditDraft {
  customerId: string;
  grain: GrainKey;
  customGrain: string;
  size: SizeKey;
  weight: string;
  rate: string;
}

function draftFromOrder(order: OrderView): EditDraft {
  const g = grainKeyOf(order.grainType);
  return {
    customerId: order.customer?.id ?? "",
    grain: g ?? "other",
    customGrain: g ? "" : order.grainType,
    size: sizeKeyOf(order.requiredSize) ?? "medium",
    weight: String(order.weightKg),
    rate: String(order.ratePerKg),
  };
}

export function QueuePanel({
  orders,
  customers,
  defaultRates = DEFAULT_RATES as unknown as Record<string, Record<string, number>>,
}: {
  orders: OrderView[];
  customers: CustomerView[];
  defaultRates?: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const lang = useLang();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionOrder, setActionOrder] = useState<OrderView | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(order: OrderView) {
    setEditingId(order.id);
    setDraft(draftFromOrder(order));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !draft) return;
    const weight = parseFloat(draft.weight);
    const rate = parseFloat(draft.rate);
    if (!Number.isFinite(weight) || weight <= 0) {
      setEditError(lang === "mr" ? "योग्य वजन टाका" : "Please enter a valid weight (kg)");
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setEditError(lang === "mr" ? "योग्य दर टाका" : "Please enter a valid rate (₹/kg)");
      return;
    }
    const grainType = draft.grain === "other" ? draft.customGrain.trim() : draft.grain;
    if (!grainType) {
      setEditError(lang === "mr" ? "धान्याचे नाव टाका" : "Please specify grain name");
      return;
    }

    setActionId(editingId);
    setEditError(null);
    try {
      const res = await apiFetch(`/api/orders/${editingId}`, {
        method: "PATCH",
        body: {
          customerId: draft.customerId,
          grainType,
          requiredSize: draft.size,
          weightKg: weight,
          ratePerKg: rate,
        },
      });
      if (!res.ok) {
        setEditError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Edit failed. Please try again."));
        return;
      }
      cancelEdit();
      router.refresh();
    } finally {
      setActionId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {lang === "mr"
          ? "याक्षणी रांगेत कोणतीही प्रलंबित ऑर्डर नाही."
          : "No pending or processing orders in the queue right now."}
      </p>
    );
  }

  const draftWeight = draft ? parseFloat(draft.weight) : NaN;
  const draftRate = draft ? parseFloat(draft.rate) : NaN;
  const draftTotal =
    Number.isFinite(draftWeight) && Number.isFinite(draftRate)
      ? Math.round(draftWeight * draftRate * 100) / 100
      : 0;

  const inputClass =
    "w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm bg-white dark:border-zinc-700 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100";
  const labelClass = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {orders.map((order) => {
          const step = ADVANCE[order.status];
          const busy = actionId === order.id;
          const isEditing = editingId === order.id;
          return (
            <li
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {lang === "mr" ? `रांग क्र. ${order.queueNo ?? order.orderId}` : `Token #${order.queueNo ?? order.orderId}`}
                  </span>
                  <StatusBadge status={order.status} lang={lang} />
                </div>

                <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {order.customer ? order.customer.name : "—"}
                  {order.customer && (
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      {" "}
                      · {order.customer.mobile}
                    </span>
                  )}
                </p>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} ·{" "}
                  {order.weightKg} kg · ₹{order.ratePerKg}/kg
                </p>

                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Order #{order.orderId} ·{" "}
                  {new Date(order.createdAt).toLocaleString(lang === "mr" ? "mr-IN" : "en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {lang === "mr" ? "किंमत ₹" : "Total ₹"} {order.totalCharges.toLocaleString("en-IN")}
                  </p>
                  {order.outstanding > 0 ? (
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      {lang === "mr" ? "बाकी ₹" : "Due ₹"} {order.outstanding.toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {lang === "mr" ? "पैसे पूर्ण" : "Paid"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {step && (
                    <button
                      onClick={() => setActionOrder(order)}
                      disabled={busy || isEditing || actionOrder !== null}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {lang === "mr" ? step.mr : step.en}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isEditing ? cancelEdit() : startEdit(order))}
                    disabled={busy || actionOrder !== null}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {isEditing ? (lang === "mr" ? "रद्द करा" : "Cancel") : (lang === "mr" ? "सुधारणा" : "Edit")}
                  </button>
                </div>
              </div>

              {isEditing && draft && (
                <form
                  onSubmit={saveEdit}
                  className="flex w-full flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>{lang === "mr" ? "ग्राहक" : "Customer"}</label>
                      <select
                        value={draft.customerId}
                        onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
                        className={inputClass}
                      >
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} · {c.mobile}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>{lang === "mr" ? "धान्य" : "Grain"}</label>
                      <select
                        value={draft.grain}
                        onChange={(e) => {
                          const grain = e.target.value as GrainKey;
                          setDraft({
                            ...draft,
                            grain,
                            rate: grain === "other" ? draft.rate : String(defaultRates[grain]?.[draft.size] ?? DEFAULT_RATES[grain][draft.size]),
                          });
                        }}
                        className={inputClass}
                      >
                        {GRAINS.map((g) => (
                          <option key={g.key} value={g.key}>
                            {grainLabel(g.key, lang)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>{lang === "mr" ? "दळणाचा क्रम / आकार" : "Grind Size"}</label>
                      <select
                        value={draft.size}
                        onChange={(e) => {
                          const size = e.target.value as SizeKey;
                          setDraft({
                            ...draft,
                            size,
                            rate: draft.grain === "other" ? draft.rate : String(defaultRates[draft.grain]?.[size] ?? DEFAULT_RATES[draft.grain][size]),
                          });
                        }}
                        className={inputClass}
                      >
                        {SIZES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {sizeLabel(s.key, lang)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>{lang === "mr" ? "वजन (किलो)" : "Weight (kg)"}</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={draft.weight}
                        onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>{lang === "mr" ? "दर (₹/किलो)" : "Rate (₹/kg)"}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={draft.rate}
                        onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    {draft.grain === "other" && (
                      <div>
                        <label className={labelClass}>{lang === "mr" ? "धान्याचे नाव" : "Custom Grain"}</label>
                        <input
                          value={draft.customGrain}
                          onChange={(e) => setDraft({ ...draft, customGrain: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    )}

                    <div className="flex items-end pb-0.5">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {lang === "mr" ? "नवीन एकूण ₹ " : "New Total ₹ "}{draftTotal.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}

                  <div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      {busy ? "..." : (lang === "mr" ? "जतन करा" : "Save Changes")}
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {actionOrder && (
        <OrderActionModal order={actionOrder} onClose={() => setActionOrder(null)} />
      )}
    </div>
  );
}