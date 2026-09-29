import "server-only";

import { Types } from "mongoose";

import { connectDb } from "@/lib/db";
import { CustomerModel } from "@/models/Customer";
import { OrderModel, type PaymentMethod, type OrderStatus } from "@/models/Order";
import { requireSession } from "@/services/authService";

/**
 * Reporting / export aggregations for the owner.
 *
 * Two different notions of time live here, deliberately:
 *  - **activity** (orders created, kg, charges, grain breakdown) is scoped to
 *    the selected date range;
 *  - **money collected** is scoped by each receipt's `recordedAt`, so a late
 *    उधारी settlement counts on the day the cash/UPI actually came in;
 *  - the **customer dues ledger** is a *current* snapshot, because a balance
 *    has no single date.
 */

export type ReportPreset = "today" | "7d" | "30d" | "custom";

export interface ReportRange {
  preset: ReportPreset;
  from: Date;
  to: Date;
}

export interface GrainRow {
  grainType: string;
  orders: number;
  weightKg: number;
  totalCharges: number;
}

export interface UpiReceiptRow {
  orderId: number;
  amount: number;
  upiTxnId?: string;
  recordedAt: string;
}

export interface CustomerLedgerRow {
  id: string;
  name: string;
  mobile: string;
  orders: number;
  totalCharges: number;
  paid: number;
  outstanding: number;
  collectedInPeriod: number;
  /**
   * Cash received on orders that were later CANCELLED — money that has to go
   * back to this customer. Tracked outside `outstanding` so a voided order can
   * never inflate what they supposedly owe, while the refund stays visible.
   */
  refundPending: number;
}

export interface ReceiptRow {
  orderId: number;
  customer: string;
  mobile: string;
  amount: number;
  method: PaymentMethod;
  upiTxnId?: string;
  recordedAt: string;
}

export interface ReportSummary {
  range: { preset: ReportPreset; from: string; to: string };
  activity: {
    ordersCreated: number;
    weightKg: number;
    totalCharges: number;
    collected: number;
    outstandingOnNewOrders: number;
  };
  byGrain: GrainRow[];
  byMethod: { cash: number; upi: number };
  upiReceipts: UpiReceiptRow[];
  customers: CustomerLedgerRow[];
  receipts: ReceiptRow[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Local-midnight date from a `YYYY-MM-DD` string (avoids the UTC parse shift). */
function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve `?preset=&from=&to=` into a concrete inclusive date range. */
export function resolveRange(params: URLSearchParams): ReportRange {
  const preset = params.get("preset");
  const today = new Date();

  if (preset === "today") {
    return { preset: "today", from: startOfDay(today), to: endOfDay(today) };
  }
  if (preset === "custom") {
    const from = parseLocalDate(params.get("from"));
    const to = parseLocalDate(params.get("to"));
    if (from && to && from <= to) {
      return { preset: "custom", from: startOfDay(from), to: endOfDay(to) };
    }
    // Invalid/custom missing → fall through to the default window.
  }
  if (preset === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { preset: "7d", from: startOfDay(from), to: endOfDay(today) };
  }

  // Default: last 30 days (inclusive of today).
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { preset: "30d", from: startOfDay(from), to: endOfDay(today) };
}

type LeanOrder = {
  orderId: number;
  customerId: Types.ObjectId | { _id: Types.ObjectId; name?: string; mobile?: string } | null;
  grainType: string;
  weightKg: number;
  totalCharges: number;
  paidAmount: number;
  status: OrderStatus;
  payments?: { amount: number; method: PaymentMethod; upiTxnId?: string; recordedAt: Date }[];
  createdAt: Date;
};

function customerOf(row: LeanOrder): { id: string; name: string; mobile: string } | null {
  const c = row.customerId;
  if (!c) return null;
  if (c instanceof Types.ObjectId) return null;
  if (!c._id) return null;
  return { id: String(c._id), name: c.name ?? "—", mobile: c.mobile ?? "" };
}

export async function getReportSummary(range: ReportRange): Promise<ReportSummary> {
  await requireSession("owner");
  await connectDb();

  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  const inRange = (d: Date): boolean => {
    const t = new Date(d).getTime();
    return t >= fromMs && t <= toMs;
  };

  const [orders, customers] = await Promise.all([
    OrderModel.find()
      .populate<{ customerId: { _id: Types.ObjectId; name: string; mobile: string } }>(
        "customerId",
        "name mobile",
      )
      .lean(),
    CustomerModel.find().select("name mobile active").lean(),
  ]);

  const rows = orders as unknown as LeanOrder[];

  /* ----- activity: orders created within the range -----
   * Cancelled orders are excluded from every volume/charge figure: they were
   * void, so their weight and charges are not revenue. Their RECEIPTS are still
   * counted below (real cash came in) and any balance is reported as a refund. */
  const created = rows.filter((o) => inRange(o.createdAt) && o.status !== "cancelled");
  const activity = {
    ordersCreated: created.length,
    weightKg: round2(created.reduce((s, o) => s + (o.weightKg ?? 0), 0)),
    totalCharges: round2(created.reduce((s, o) => s + (o.totalCharges ?? 0), 0)),
    collected: 0,
    outstandingOnNewOrders: round2(
      created.reduce((s, o) => s + Math.max(0, (o.totalCharges ?? 0) - (o.paidAmount ?? 0)), 0),
    ),
  };

  /* ----- grain breakdown (orders in range) ----- */
  const grainMap = new Map<string, GrainRow>();
  for (const o of created) {
    const g = grainMap.get(o.grainType) ?? {
      grainType: o.grainType,
      orders: 0,
      weightKg: 0,
      totalCharges: 0,
    };
    g.orders += 1;
    g.weightKg = round2(g.weightKg + (o.weightKg ?? 0));
    g.totalCharges = round2(g.totalCharges + (o.totalCharges ?? 0));
    grainMap.set(o.grainType, g);
  }

  /* ----- receipts (money in) within the range, across ALL orders ----- */
  const byMethod = { cash: 0, upi: 0 };
  const upiReceipts: UpiReceiptRow[] = [];
  const receipts: ReceiptRow[] = [];

  for (const o of rows) {
    const cust = customerOf(o);
    for (const p of o.payments ?? []) {
      if (!inRange(p.recordedAt)) continue;
      const amount = round2(p.amount ?? 0);
      activity.collected = round2(activity.collected + amount);
      if (p.method === "upi") {
        byMethod.upi = round2(byMethod.upi + amount);
        upiReceipts.push({
          orderId: o.orderId,
          amount,
          upiTxnId: p.upiTxnId,
          recordedAt: new Date(p.recordedAt).toISOString(),
        });
      } else {
        byMethod.cash = round2(byMethod.cash + amount);
      }
      receipts.push({
        orderId: o.orderId,
        customer: cust?.name ?? "—",
        mobile: cust?.mobile ?? "",
        amount,
        method: p.method,
        upiTxnId: p.upiTxnId,
        recordedAt: new Date(p.recordedAt).toISOString(),
      });
    }
  }

  receipts.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  upiReceipts.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  /* ----- customer dues ledger (current snapshot) ----- */
  const ledger = new Map<string, CustomerLedgerRow>();
  for (const c of customers) {
    ledger.set(String(c._id), {
      id: String(c._id),
      name: c.name,
      mobile: c.mobile,
      orders: 0,
      totalCharges: 0,
      paid: 0,
      outstanding: 0,
      collectedInPeriod: 0,
      refundPending: 0,
    });
  }
  const emptyEntry = (cust: { id: string; name: string; mobile: string }): CustomerLedgerRow => ({
    id: cust.id,
    name: cust.name,
    mobile: cust.mobile,
    orders: 0,
    totalCharges: 0,
    paid: 0,
    outstanding: 0,
    collectedInPeriod: 0,
    refundPending: 0,
  });

  for (const o of rows) {
    const cust = customerOf(o);
    if (!cust) continue;
    const entry = ledger.get(cust.id) ?? emptyEntry(cust);

    // A cancelled order contributes NO charges and NO due — but its receipts are
    // real cash, and anything still on it is owed back rather than billed. The
    // `continue` here is deliberate: skipping the row entirely would also skip
    // its payments and understate what the mill actually collected.
    if (o.status === "cancelled") {
      for (const p of o.payments ?? []) {
        if (inRange(p.recordedAt)) {
          entry.collectedInPeriod = round2(entry.collectedInPeriod + (p.amount ?? 0));
        }
      }
      entry.refundPending = round2(entry.refundPending + (o.paidAmount ?? 0));
      ledger.set(cust.id, entry);
      continue;
    }

    entry.orders += 1;
    entry.totalCharges = round2(entry.totalCharges + (o.totalCharges ?? 0));
    entry.paid = round2(entry.paid + (o.paidAmount ?? 0));
    entry.outstanding = round2(Math.max(0, entry.totalCharges - entry.paid));
    for (const p of o.payments ?? []) {
      if (inRange(p.recordedAt)) entry.collectedInPeriod = round2(entry.collectedInPeriod + (p.amount ?? 0));
    }
    ledger.set(cust.id, entry);
  }

  const customerRows = [...ledger.values()].sort((a, b) => {
    if (a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
    return a.name.localeCompare(b.name, "en");
  });

  return {
    range: {
      preset: range.preset,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    activity,
    byGrain: [...grainMap.values()].sort((a, b) => b.totalCharges - a.totalCharges),
    byMethod,
    upiReceipts,
    customers: customerRows,
    receipts,
  };
}
