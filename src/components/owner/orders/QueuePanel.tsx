"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { DEFAULT_RATES, grainKeyOf, grainLabel, GRAINS, sizeKeyOf, sizeLabel, SIZES, type GrainKey, type SizeKey } from "@/lib/millings";
import { formatDateTime, type Lang } from "@/lib/i18n/format";
import { StatusBadge } from "@/components/common";
import { OrderActionModal } from "./OrderActionModal";
import { CancelOrderDialog } from "./CancelOrderDialog";
import type { CustomerView } from "@/services/customerService";
import type { OrderView } from "@/services/orderService";
import type { OrderStatus } from "@/models/Order";

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
  lang,
}: {
  orders: OrderView[];
  customers: CustomerView[];
  defaultRates?: Record<string, Record<string, number>>;
  lang: Lang;
}) {
  const router = useRouter();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionOrder, setActionOrder] = useState<OrderView | null>(null);

  const [cancelOrder, setCancelOrder] = useState<OrderView | null>(null);

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
      <p className="rounded-2xl border border-dashed border-clay-200/80 bg-white/60 p-8 text-center text-sm font-medium text-muted dark:border-earth-800 dark:bg-earth-900 dark:text-earth-400">
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

  const inputClass = "stitch-input w-full text-sm";
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted dark:text-earth-400";

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
              className="stitch-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-clay-200/80 bg-clay-50 px-2.5 py-0.5 text-xs font-bold text-clay-800 shadow-xs dark:border-earth-700 dark:bg-earth-800 dark:text-earth-300">
                    {lang === "mr" ? `रांग क्र. ${order.queueNo ?? order.orderId}` : `Token #${order.queueNo ?? order.orderId}`}
                  </span>
                  <StatusBadge status={order.status} lang={lang} />
                </div>

                <p className="truncate text-base font-bold text-earth-900 dark:text-earth-100">
                  {order.customer ? order.customer.name : "—"}
                  {order.customer && (
                    <span className="font-medium text-xs text-muted dark:text-earth-400">
                      {" "}
                      · {order.customer.mobile}
                    </span>
                  )}
                </p>

                <p className="text-xs font-medium text-muted dark:text-earth-400">
                  {grainLabel(order.grainType, lang)} · {sizeLabel(order.requiredSize, lang)} ·{" "}
                  {order.weightKg} kg · ₹{order.ratePerKg}/kg
                </p>

                <p className="text-[11px] text-muted dark:text-earth-400">
                  <Link href={`/owner/orders/${order.orderId}`} className="font-semibold text-clay-700 hover:underline dark:text-clay-400">
                    Order #{order.orderId}
                  </Link>{" "}
                  ·{" "}
                  {formatDateTime(order.createdAt, lang)}
                </p>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="text-right">
                  <p className="text-sm font-extrabold text-clay-700 dark:text-earth-100">
                    {lang === "mr" ? "किंमत ₹" : "Total ₹"} {order.totalCharges.toLocaleString("en-IN")}
                  </p>
                  {order.outstanding > 0 ? (
                    <p className="text-xs font-semibold text-clay-700 dark:text-clay-400">
                      {lang === "mr" ? "बाकी ₹" : "Due ₹"} {order.outstanding.toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-leaf-700 dark:text-leaf-400">
                      {lang === "mr" ? "पैसे पूर्ण" : "Paid"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {step && (
                    <button
                      onClick={() => setActionOrder(order)}
                      disabled={busy || isEditing || actionOrder !== null}
                      className="stitch-btn-primary px-3.5 py-1.5 text-xs"
                    >
                      {lang === "mr" ? step.mr : step.en}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isEditing ? cancelEdit() : startEdit(order))}
                    disabled={busy || actionOrder !== null}
                    className="stitch-btn-secondary px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    {isEditing ? (lang === "mr" ? "रद्द करा" : "Cancel") : (lang === "mr" ? "सुधारणा" : "Edit")}
                  </button>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setCancelOrder(order)}
                      disabled={busy || actionOrder !== null || editingId !== null}
                      className="px-3.5 py-1.5 text-xs font-semibold text-clay-700 hover:bg-clay-50 disabled:opacity-40 dark:text-clay-400 dark:hover:bg-clay-500/10"
                    >
                      {lang === "mr" ? "ऑर्डर रद्द" : "Cancel order"}
                    </button>
                  )}
                </div>
              </div>

              {isEditing && draft && (
                <form
                  onSubmit={saveEdit}
                  className="flex w-full flex-col gap-3 border-t border-earth-200 pt-3 dark:border-earth-800"
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
                      <p className="text-sm font-semibold text-earth-900 dark:text-earth-100">
                        {lang === "mr" ? "नवीन एकूण ₹ " : "New Total ₹ "}{draftTotal.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}

                  <div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="stitch-btn-primary px-4 py-2 text-sm"
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
        <OrderActionModal order={actionOrder} onClose={() => setActionOrder(null)} lang={lang} />
      )}

      {cancelOrder && (
        <CancelOrderDialog order={cancelOrder} onClose={() => setCancelOrder(null)} lang={lang} />
      )}
    </div>
  );
}