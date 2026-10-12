"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { DEFAULT_RATES, GRAINS, SIZES, grainLabel, sizeLabel } from "@/lib/millings";
import type { GrainKey, SizeKey } from "@/lib/millings";
import { PaymentEntry } from "@/components/owner/payments";
import type { CustomerView } from "@/services/customerService";
import type { OrderView } from "@/services/orderService";
import type { PaymentMethod } from "@/models/Order";

const MAX_LINES = 20;

interface Line {
  /** Stable identity for React. Lines are added AND removed by index, so
      `key={index}` made React reuse the previous row's DOM after a delete and
      the field values appeared to shift up into the wrong bag. */
  id: number;
  grain: GrainKey;
  customGrain: string;
  size: SizeKey;
  weightKg: string;
  ratePerKg: string;
}

export function NewOrderForm({
  customers,
  defaultRates = DEFAULT_RATES as unknown as Record<string, Record<string, number>>,
  initialLang = "en",
}: {
  customers: CustomerView[];
  defaultRates?: Record<string, Record<string, number>>;
  initialLang?: "mr" | "en";
}) {
  const router = useRouter();
  const lang = initialLang;

  const rateFor = (grain: GrainKey, size: SizeKey): string =>
    String(defaultRates[grain]?.[size] ?? DEFAULT_RATES[grain][size]);

  const blankLine = (id: number): Line => ({
    id,
    grain: "maize",
    customGrain: "",
    size: "medium",
    weightKg: "",
    ratePerKg: rateFor("maize", "medium"),
  });

  const [customerId, setCustomerId] = useState("");
  // Ids are derived from the existing lines rather than a mutable counter, so
  // nothing reads a ref during render (react-hooks/refs) and the first client
  // render matches SSR exactly.
  const nextLineId = (ls: Line[]): number => ls.reduce((m, l) => Math.max(m, l.id), 0) + 1;

  const [lines, setLines] = useState<Line[]>(() => [blankLine(1)]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdNos, setCreatedNos] = useState<number[] | null>(null);
  const [takeAdvance, setTakeAdvance] = useState(false);
  const [advance, setAdvance] = useState("");
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>("cash");
  const [advanceUpiTxnId, setAdvanceUpiTxnId] = useState("");

  function setLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function onGrainChange(index: number, grain: GrainKey) {
    const size = lines[index]?.size ?? "medium";
    const patch: Partial<Line> = { grain };
    if (grain !== "other") patch.ratePerKg = rateFor(grain, size);
    setLine(index, patch);
  }

  function onSizeChange(index: number, size: SizeKey) {
    const grain = lines[index]?.grain ?? "maize";
    const patch: Partial<Line> = { size };
    if (grain !== "other") patch.ratePerKg = rateFor(grain, size);
    setLine(index, patch);
  }

  function addLine() {
    setLines((prev) => (prev.length >= MAX_LINES ? prev : [...prev, blankLine(nextLineId(prev))]));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const lineTotal = (l: Line): number => {
    const w = parseFloat(l.weightKg);
    const r = parseFloat(l.ratePerKg);
    return Number.isFinite(w) && Number.isFinite(r) && w > 0 ? Math.round(w * r * 100) / 100 : 0;
  };

  const validLines = lines.filter(
    (l) =>
      parseFloat(l.weightKg) > 0 &&
      Number.isFinite(parseFloat(l.ratePerKg)) &&
      (l.grain !== "other" || l.customGrain.trim().length > 0),
  );
  const totalWeight = validLines.reduce((s, l) => s + parseFloat(l.weightKg), 0);
  const batchTotal = validLines.reduce((s, l) => s + lineTotal(l), 0);

  const parsedAdvance = parseFloat(advance);
  const advanceValid =
    !takeAdvance ||
    (Number.isFinite(parsedAdvance) && parsedAdvance > 0 && parsedAdvance <= batchTotal + 1e-9);
  const upiValidAdvance =
    !takeAdvance || advanceMethod !== "upi" || advanceUpiTxnId.trim().length >= 6;
  const advanceAmount =
    takeAdvance && Number.isFinite(parsedAdvance) && parsedAdvance > 0
      ? Math.round(parsedAdvance * 100) / 100
      : 0;
  const balance = Math.max(0, Math.round((batchTotal - advanceAmount) * 100) / 100);

  const inputClass = "stitch-input w-full";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted dark:text-earth-300";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedNos(null);
    setPending(true);
    try {
      if (validLines.length === 0) {
        setError(
          lang === "mr"
            ? "किमान एक ओळ वजनसहित भरा"
            : "Fill in weight for at least one grain line",
        );
        return;
      }
      if (!advanceValid || !upiValidAdvance) {
        setError(
          lang === "mr"
            ? "आगाऊ रक्कम किंवा UPI आयडी बरोबर भरा"
            : "Enter a valid advance amount or UPI Transaction ID",
        );
        return;
      }
      const body = {
        customerId,
        items: validLines.map((l) => ({
          grainType: l.grain === "other" ? l.customGrain.trim() : l.grain,
          requiredSize: l.size,
          weightKg: Math.round(parseFloat(l.weightKg) * 100) / 100,
          ratePerKg: Math.round(parseFloat(l.ratePerKg) * 100) / 100,
        })),
        ...(takeAdvance
          ? {
              advanceAmount,
              advanceMethod,
              advanceUpiTxnId: advanceMethod === "upi" ? advanceUpiTxnId.trim() : undefined,
            }
          : {}),
      };
      const res = await apiFetch<{ orders: OrderView[] }>("/api/orders", { body });
      if (!res.ok) {
        setError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Failed to create order. Please try again."));
        return;
      }
      const ids = (res.data?.orders ?? []).map((o) => o.orderId);
      setCreatedNos(ids);
      router.refresh();
      setCustomerId("");
      setLines([blankLine(1)]);
      setTakeAdvance(false);
      setAdvance("");
      setAdvanceMethod("cash");
      setAdvanceUpiTxnId("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="order-customer" className={labelClass}>
          {lang === "mr" ? "ग्राहक निवडा" : "Customer"}
        </label>
        <select
          id="order-customer"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={inputClass}
        >
          <option value="">{lang === "mr" ? "ग्राहक निवडा..." : "Select Customer..."}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.mobile}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-heading dark:text-earth-100">
            {lang === "mr" ? "दळणाच्या नोंदी (बॅगा)" : "Milling lines (bags)"}
          </h2>
          <button
            type="button"
            onClick={addLine}
            disabled={lines.length >= MAX_LINES}
            className="stitch-btn-secondary px-3 py-1.5 text-xs"
          >
            {lang === "mr" ? "+ आणखी एक बॅग" : "+ Add another bag"}
          </button>
        </div>

        {lines.map((line, i) => (
          <div
            key={line.id}
            className="rounded-2xl border border-clay-200/80 bg-clay-50/30 p-4 dark:border-earth-800 dark:bg-earth-950"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className={labelClass}>{lang === "mr" ? "धान्य" : "Grain"}</label>
                <select
                  value={line.grain}
                  onChange={(e) => onGrainChange(i, e.target.value as GrainKey)}
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
                <label className={labelClass}>{lang === "mr" ? "आकार" : "Size"}</label>
                <select
                  value={line.size}
                  onChange={(e) => onSizeChange(i, e.target.value as SizeKey)}
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
                  required
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  value={line.weightKg}
                  onChange={(e) => setLine(i, { weightKg: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{lang === "mr" ? "दर (₹/किलो)" : "Rate (₹/kg)"}</label>
                <input
                  type="number"
                  required
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={line.ratePerKg}
                  onChange={(e) => setLine(i, { ratePerKg: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex items-end justify-between gap-2">
                <p className="flex-1 rounded-xl border border-clay-200/80 bg-white px-3 py-2 text-sm text-earth-900 shadow-xs dark:border-earth-800 dark:bg-earth-900 dark:text-earth-100">
                  <span className="block text-[11px] font-semibold text-muted dark:text-earth-400">₹ एकूण</span>
                  <span className="font-bold text-earth-900 dark:text-earth-100">{lineTotal(line).toLocaleString("en-IN")}</span>
                </p>
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 1}
                  aria-label={lang === "mr" ? "ओळ काढा" : "Remove line"}
                  className="rounded-xl border border-clay-200 bg-white px-3 py-2.5 text-sm font-bold text-clay-600 shadow-xs transition-colors hover:bg-clay-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-earth-700 dark:bg-earth-900 dark:text-clay-400 dark:hover:bg-earth-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {line.grain === "other" && (
              <div className="mt-3">
                <label className={labelClass}>{lang === "mr" ? "धान्याचे नाव टाका" : "Custom Grain Name"}</label>
                <input
                  value={line.customGrain}
                  onChange={(e) => setLine(i, { customGrain: e.target.value })}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-clay-200/80 bg-clay-50/40 px-3.5 py-2.5 text-sm font-semibold text-clay-950 dark:border-earth-800 dark:bg-earth-900 dark:text-earth-200">
          <input
            type="checkbox"
            checked={takeAdvance}
            onChange={(e) => {
              setTakeAdvance(e.target.checked);
              if (e.target.checked && batchTotal > 0) setAdvance(String(batchTotal));
            }}
            className="h-4 w-4 rounded border-clay-300 accent-clay-600"
          />
          <span>{lang === "mr" ? "आगाऊ रक्कम (Advance Payment) नोंदवा" : "Record Advance Payment"}</span>
        </label>

        {takeAdvance && (
          <PaymentEntry
            amount={advance}
            onAmountChange={setAdvance}
            method={advanceMethod}
            onMethodChange={setAdvanceMethod}
            upiTxnId={advanceUpiTxnId}
            onUpiTxnIdChange={setAdvanceUpiTxnId}
            max={batchTotal}
            heading={lang === "mr" ? "आगाऊ रक्कम विवरण" : "Advance Payment Details"}
            lang={lang}
          />
        )}

        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-clay-200/80 bg-white p-3 shadow-xs dark:border-earth-800 dark:bg-earth-950">
            <span className="block text-xs font-semibold text-muted dark:text-earth-400">
              {lang === "mr" ? "एकूण बॅगा / वजन" : "Bags / Total weight"}
            </span>
            <span className="mt-1 block text-base font-extrabold text-earth-900 dark:text-earth-100">
              {validLines.length} · {Math.round(totalWeight * 100) / 100} kg
            </span>
          </div>
          <div className="rounded-xl border border-clay-200/80 bg-white p-3 shadow-xs dark:border-earth-800 dark:bg-earth-950">
            <span className="block text-xs font-semibold text-muted dark:text-earth-400">
              {lang === "mr" ? "एकूण आकारणी" : "Total Charges"}
            </span>
            <span className="mt-1 block text-base font-extrabold text-clay-700 dark:text-clay-400">
              ₹ {batchTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="rounded-xl border border-clay-200/80 bg-white p-3 shadow-xs dark:border-earth-800 dark:bg-earth-950">
            <span className="block text-xs font-semibold text-muted dark:text-earth-400">
              {lang === "mr" ? "उर्वरित बाकी" : "Balance Due"}
            </span>
            <span className={`mt-1 block text-base font-extrabold ${balance > 0 ? "text-clay-700 dark:text-clay-400" : "text-leaf-700 dark:text-leaf-400"}`}>
              ₹ {balance.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-clay-200 bg-clay-50 p-3 text-xs font-semibold text-clay-800 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300">
          {error}
        </div>
      )}

      {createdNos !== null && (
        <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-3.5 text-sm font-semibold text-leaf-900 shadow-xs dark:border-leaf-500/40 dark:bg-leaf-500/10 dark:text-leaf-200">
          {lang === "mr"
            ? `ऑर्डर ${createdNos.join(", #")} यशस्वीरित्या नोंदवल्या (${createdNos.length}).`
            : `Order${createdNos.length > 1 ? "s" : ""} #${createdNos.join(", #")} created (${createdNos.length}).`}
          <Link href="/owner/queue" className="ml-2 font-bold underline underline-offset-2 hover:text-leaf-950">
            {lang === "mr" ? "रांग यादी पहा →" : "View Queue →"}
          </Link>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || customers.length === 0}
          className="stitch-btn-primary px-6 py-3.5 text-base"
        >
          {pending ? "..." : lang === "mr" ? "+ ऑर्डर तयार करा" : "+ Create Order"}
        </button>
        {customers.length === 0 && (
          <p className="mt-2 text-xs text-muted dark:text-earth-400">
            {lang === "mr" ? "ऑर्डरसाठी प्रथम ग्राहक नोंदवा." : "Please add a customer account first."}{" "}
            <Link href="/owner/customers" className="font-semibold text-clay-700 underline dark:text-clay-400">
              {lang === "mr" ? "ग्राहक खाती" : "Manage Customers"}
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}