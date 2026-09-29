import "server-only";

import type { Types } from "mongoose";

import { connectDb } from "@/lib/db";
import { AppError, badRequestError, notFoundError } from "@/lib/errors";
import { CustomerModel } from "@/models/Customer";
import {
  OrderModel,
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentEntry,
  type PaymentMethod,
  type StatusHistoryEntry,
} from "@/models/Order";
import { SequenceModel } from "@/models/Sequence";
import { requireSession } from "@/services/authService";
import { notifyCustomer } from "@/services/notificationService";

/**
 * Order lifecycle (owner-only):
 *
 *   pending → processing → completed → collected   (strict, forward-only)
 *   any non-collected status → cancelled          (terminal off-ramp)
 *
 * Cancellation is a SOFT delete: the document, its payments and its status
 * history are never removed, so a cancelled order stays auditable and the cash it
 * collected keeps showing in the ledger (as a refund owed, see `toView`).
 *
 * The notification trigger IS this service: each step writes an in-app
 * notification for the customer via `notifyCustomer`. A notification failure
 * never blocks the order itself.
 */

export const NOTIF_KEYS: Record<OrderStatus, string> = {
  pending: "notif.orderReceived",
  processing: "notif.orderProcessing",
  completed: "notif.orderCompleted",
  collected: "notif.orderCollected",
  cancelled: "notif.orderCancelled",
};

/**
 * Forward-only lifecycle. `cancelled` is absent on purpose: a cancelled order
 * has no next step, so `transitionOrder` can never move it forward again.
 */
const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "processing",
  processing: "completed",
  completed: "collected",
  collected: null,
  cancelled: null,
};

export interface OrderView {
  id: string;
  orderId: number;
  /** Live queue position (1 = first, "रांग क्र."). Only set in queue listings. */
  queueNo?: number;
  customer: { id: string; name: string; mobile: string } | null;
  grainType: string;
  requiredSize: string;
  weightKg: number;
  ratePerKg: number;
  totalCharges: number;
  paidAmount: number;
  outstanding: number;
  /**
   * Cash sitting on a CANCELLED order that now has to be handed back to the
   * customer. Always 0 for a live order. Informational only — nothing in the app
   * records a refund being given, so it stays pending until settled off-system.
   */
  refundDue: number;
  payments: { amount: number; method: PaymentMethod; upiTxnId?: string; recordedAt: string }[];
  /** Per-step timestamps of the order's journey, oldest first. */
  statusHistory: { status: OrderStatus; at: string }[];
  status: OrderStatus;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentInput = {
  amount: number;
  method: PaymentMethod;
  upiTxnId?: string;
};

export interface CancelOrderInput {
  /** Optional free-text note explaining why (≤200 chars, validated by zod). */
  reason?: string;
}

type OrderRow = {
  _id: Types.ObjectId;
  orderId: number;
  customerId: Types.ObjectId;
  grainType: string;
  requiredSize: string;
  weightKg: number;
  ratePerKg: number;
  totalCharges: number;
  paidAmount: number;
  payments: PaymentEntry[];
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: { _id: Types.ObjectId; name: string; mobile: string } | null;
};

function toView(doc: OrderRow): OrderView {
  const customer = doc.customer ?? null;
  const isCancelled = doc.status === "cancelled";
  const paid = doc.paidAmount ?? 0;
  return {
    id: String(doc._id),
    orderId: doc.orderId,
    customer: customer
      ? { id: String(customer._id), name: customer.name, mobile: customer.mobile }
      : null,
    grainType: doc.grainType,
    requiredSize: doc.requiredSize,
    weightKg: doc.weightKg,
    ratePerKg: doc.ratePerKg,
    totalCharges: doc.totalCharges,
    paidAmount: paid,
    // A cancelled order is void, so it can NEVER contribute to what a customer
    // supposedly owes. This one line is what keeps the Outstanding page, the
    // payments hub and the dashboard ₹ totals honest — they all read
    // `outstanding`. Money already received on it surfaces as `refundDue`
    // instead, so nothing is silently lost.
    outstanding: isCancelled
      ? 0
      : Math.max(0, Math.round((doc.totalCharges - paid) * 100) / 100),
    refundDue: isCancelled ? Math.max(0, Math.round(paid * 100) / 100) : 0,
    payments: (doc.payments ?? []).map((p) => ({
      amount: p.amount,
      method: p.method,
      upiTxnId: p.upiTxnId,
      recordedAt: p.recordedAt instanceof Date ? p.recordedAt.toISOString() : String(p.recordedAt),
    })),
    statusHistory: (doc.statusHistory ?? []).map((h) => ({
      status: h.status,
      at: h.at instanceof Date ? h.at.toISOString() : String(h.at),
    })),
    status: doc.status,
    cancelledAt:
      doc.cancelledAt instanceof Date ? doc.cancelledAt.toISOString() : undefined,
    cancelReason: doc.cancelReason,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

/** Atomic next human-readable order number (1, 2, 3…). */
async function nextOrderId(): Promise<number> {
  const doc = await SequenceModel.findOneAndUpdate(
    { name: "orderId" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return doc.value;
}

export interface CreateOrderInput {
  customerId: string;
  grainType: string;
  requiredSize: string;
  weightKg: number;
  ratePerKg: number;
  /** Advance paid at intake (cash/UPI). */
  advancePayment?: PaymentInput;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();

  const customer = await CustomerModel.findById(input.customerId).select("name lang active");
  if (!customer) throw badRequestError("Customer not found");
  if (!customer.active) throw new AppError(400, "Customer is inactive", "CUSTOMER_INACTIVE");

  const totalCharges = Math.round(input.weightKg * input.ratePerKg * 100) / 100;

  let paidAmount = 0;
  let payments: PaymentEntry[] = [];
  if (input.advancePayment) {
    const advance = Math.round(input.advancePayment.amount * 100) / 100;
    if (!(advance > 0)) throw badRequestError("Advance amount must be positive");
    if (advance > totalCharges) throw badRequestError("Advance cannot exceed the order total");
    paidAmount = advance;
    payments = [
      {
        amount: advance,
        method: input.advancePayment.method,
        upiTxnId:
          input.advancePayment.method === "upi" ? input.advancePayment.upiTxnId : undefined,
        recordedAt: new Date(),
      },
    ];
  }

  const now = new Date();
  const doc = await OrderModel.create({
    orderId: await nextOrderId(),
    customerId: customer._id,
    grainType: input.grainType,
    requiredSize: input.requiredSize,
    weightKg: input.weightKg,
    ratePerKg: input.ratePerKg,
    totalCharges,
    paidAmount,
    payments,
    status: "pending",
    statusHistory: [{ status: "pending", at: now }],
  });

  await safelyNotify({
    customerId: customer._id,
    type: "orderReceived",
    messageKey: NOTIF_KEYS.pending,
    lang: customer.lang,
  });

  return toView(doc.toObject() as unknown as OrderRow);
}

export interface CreateOrdersInput {
  customerId: string;
  items: {
    grainType: string;
    requiredSize: string;
    weightKg: number;
    ratePerKg: number;
  }[];
  /** Shared advance taken at intake for the whole batch. */
  advancePayment?: PaymentInput;
}

/** Reserve a run of `count` consecutive human-readable order numbers. */
async function nextOrderIds(count: number): Promise<number[]> {
  const doc = await SequenceModel.findOneAndUpdate(
    { name: "orderId" },
    { $inc: { value: count } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  const last = doc.value;
  return Array.from({ length: count }, (_, i) => last - (count - 1 - i));
}

/**
 * Multi-line intake: one customer + several grain bags → one order per bag,
 * all created in a single submit with consecutive orderIds. A single container
 * advance is auto-allocated across the lines in order (fills line 1's balance,
 * remainder flows to the next line) so every order's receipt stays honest.
 */
export async function createOrders(input: CreateOrdersInput): Promise<OrderView[]> {
  await requireSession("owner");
  await connectDb();

  const customer = await CustomerModel.findById(input.customerId).select("name mobile lang active");
  if (!customer) throw badRequestError("Customer not found");
  if (!customer.active) throw new AppError(400, "Customer is inactive", "CUSTOMER_INACTIVE");

  const lines = input.items.map((item) => ({
    ...item,
    totalCharges: Math.round(item.weightKg * item.ratePerKg * 100) / 100,
  }));
  if (lines.length === 0) throw badRequestError("At least one grain line is required");

  const batchTotal = lines.reduce((s, l) => s + l.totalCharges, 0);

  let advance = 0;
  let method: PaymentMethod | undefined;
  let upiTxnId: string | undefined;
  if (input.advancePayment) {
    advance = Math.round(input.advancePayment.amount * 100) / 100;
    if (!(advance > 0)) throw badRequestError("Advance amount must be positive");
    if (advance > batchTotal) throw badRequestError("Advance cannot exceed the batch total");
    method = input.advancePayment.method;
    upiTxnId = method === "upi" ? input.advancePayment.upiTxnId : undefined;
  }

  // Allocate the advance across lines in order (fill one order, spill to next).
  let remaining = advance;
  const paidPerLine = lines.map((l) => {
    const allocated = Math.min(l.totalCharges, Math.round(remaining * 100) / 100);
    remaining = Math.round((remaining - allocated) * 100) / 100;
    return allocated;
  });

  const orderIds = await nextOrderIds(lines.length);
  const now = new Date();

  const docs = lines.map((line, i) => ({
    orderId: orderIds[i],
    customerId: customer._id,
    grainType: line.grainType,
    requiredSize: line.requiredSize,
    weightKg: line.weightKg,
    ratePerKg: line.ratePerKg,
    totalCharges: line.totalCharges,
    paidAmount: paidPerLine[i],
    payments:
      paidPerLine[i] > 0
        ? [
            {
              amount: paidPerLine[i],
              method: method!,
              upiTxnId,
              recordedAt: now,
            },
          ]
        : [],
    status: "pending",
    statusHistory: [{ status: "pending", at: now }],
  }));

  const created = await OrderModel.insertMany(docs);

  const views = created.map((doc) => {
    const view = toView(doc.toObject() as unknown as OrderRow);
    view.customer = { id: String(customer._id), name: customer.name, mobile: customer.mobile };
    return view;
  });

  for (let n = 0; n < views.length; n += 1) {
    await safelyNotify({
      customerId: customer._id,
      type: "orderReceived",
      messageKey: NOTIF_KEYS.pending,
      lang: customer.lang,
    });
  }

  return views;
}

export interface ListOrdersOptions {
  excludeCollected?: boolean;
  status?: OrderStatus;
}

export async function listOrders(options: ListOrdersOptions = {}): Promise<OrderView[]> {
  await requireSession("owner");
  await connectDb();

  const filter: Record<string, unknown> = {};
  // The live queue holds work still to be done: collected orders are done and
  // cancelled ones are void, so neither belongs here.
  if (options.excludeCollected) filter.status = { $nin: ["collected", "cancelled"] };
  if (options.status) filter.status = options.status;

  const sort: Record<string, 1 | -1> = options.excludeCollected
    ? { orderId: 1 }
    : { createdAt: -1 };

  const docs = await OrderModel.find(filter)
    .sort(sort)
    .populate<{ customerId: OrderRow["customer"] }>("customerId", "name mobile")
    .lean();

  return docs.map((d, index) => {
    const view = toView({
      ...(d as unknown as OrderRow),
      customer: (d.customerId as OrderRow["customer"]) ?? null,
    });
    // Queue mode: रांग क्र. = live position in the list (orderId ASC). As
    // orders get collected the rest shift up automatically — nothing stored
    // ever changes; the token number is purely the current rank.
    if (options.excludeCollected) view.queueNo = index + 1;
    return view;
  });
}

/** Fresh order view with the customer populated — used after mutations. */
export async function getOrder(orderId: string): Promise<OrderView> {
  await connectDb();
  const row = await OrderModel.findById(orderId)
    .populate<{ customerId: OrderRow["customer"] }>("customerId", "name mobile")
    .lean();
  if (!row) throw notFoundError("Order not found");
  return toView({
    ...(row as unknown as OrderRow),
    customer: (row.customerId as OrderRow["customer"]) ?? null,
  });
}

/**
 * Every order belonging to one customer, newest first, with the same
 * `outstanding` math as the owner side. Caller is responsible for session
 * gating (customer dashboard / /api/my/overview).
 */
export async function getOrdersForCustomer(
  customerId: Types.ObjectId | string,
): Promise<OrderView[]> {
  await connectDb();
  const docs = await OrderModel.find({ customerId: customerId as Types.ObjectId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => toView({ ...(d as unknown as OrderRow), customer: null }));
}

/** Look up an order by its human-readable order number (printable पावती links). */
export async function getOrderByNumber(orderNumber: number): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();
  const row = await OrderModel.findOne({ orderId: orderNumber })
    .populate<{ customerId: OrderRow["customer"] }>("customerId", "name mobile")
    .lean();
  if (!row) throw notFoundError("Order not found");
  return toView({
    ...(row as unknown as OrderRow),
    customer: (row.customerId as OrderRow["customer"]) ?? null,
  });
}

export interface UpdateOrderInput {
  customerId?: string;
  grainType?: string;
  requiredSize?: string;
  weightKg?: number;
  ratePerKg?: number;
}

/**
 * Fix an order that went wrong (wrong customer / weight / rate / grain / size).
 * Recomputes totalCharges from weight × rate. Collected orders are locked —
 * edit must happen while the order is still in the queue.
 */
export async function updateOrder(orderId: string, input: UpdateOrderInput): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();

  const doc = await OrderModel.findById(orderId);
  if (!doc) throw notFoundError("Order not found");
  if (doc.status === "collected") {
    throw new AppError(400, "Collected orders cannot be edited", "ORDER_LOCKED");
  }
  if (doc.status === "cancelled") {
    throw new AppError(400, "Cancelled orders cannot be edited", "ORDER_LOCKED");
  }

  if (input.customerId && String(input.customerId) !== String(doc.customerId)) {
    const customer = await CustomerModel.findById(input.customerId).select("active");
    if (!customer) throw badRequestError("Customer not found");
    if (!customer.active) throw new AppError(400, "Customer is inactive", "CUSTOMER_INACTIVE");
    doc.customerId = customer._id;
  }

  if (input.grainType !== undefined) doc.grainType = input.grainType;
  if (input.requiredSize !== undefined) doc.requiredSize = input.requiredSize;
  if (input.weightKg !== undefined) doc.weightKg = input.weightKg;
  if (input.ratePerKg !== undefined) doc.ratePerKg = input.ratePerKg;

  doc.totalCharges = Math.round(doc.weightKg * doc.ratePerKg * 100) / 100;
  await doc.save();

  return getOrder(orderId);
}

export interface OrderTransitionInput {
  /** The next status in the strict flow (pending → processing → completed → collected). */
  status: OrderStatus;
  /** Optional payment taken at this step (cash/UPI). */
  payment?: PaymentInput;
}

/**
 * Take an order to its next step while optionally recording a payment at the
 * same time — status, payment entry and balance are written in ONE `doc.save()`
 * so they can never fall out of sync. Only the immediate next status is allowed
 * (no skipping, no going back), and a payment can never exceed the remaining
 * balance. Fires the matching status notification (+ payment-settled when full).
 */
export async function transitionOrder(
  orderId: string,
  input: OrderTransitionInput,
): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();

  const doc = await OrderModel.findById(orderId);
  if (!doc) throw notFoundError("Order not found");

  if (NEXT_STATUS[doc.status] !== input.status) {
    throw new AppError(
      400,
      `Cannot move from "${doc.status}" to "${input.status}"`,
      "INVALID_TRANSITION",
    );
  }

  applyPayment(doc, input.payment);

  doc.status = input.status;
  doc.statusHistory = [
    ...(doc.statusHistory ?? []),
    { status: input.status, at: new Date() },
  ];
  await doc.save();

  const nowOutstanding = Math.round((doc.totalCharges - doc.paidAmount) * 100) / 100;
  const customer = await CustomerModel.findById(doc.customerId).select("lang");
  if (customer) {
    await safelyNotify({
      customerId: doc.customerId,
      type: input.status === "processing" ? "orderProcessing"
        : input.status === "completed" ? "orderCompleted"
        : "orderCollected",
      messageKey: NOTIF_KEYS[input.status],
      lang: customer.lang,
    });
    if (input.payment && nowOutstanding <= 0) {
      await notifySettled(customer._id, customer.lang);
    }
  }

  return toView(doc.toObject() as unknown as OrderRow);
}

/**
 * Record a payment on ANY order — including already-collected ones (a customer
 * settling their उधारी later). No status change; just a new receipt entry that
 * raises paidAmount. Validates the amount against the remaining balance.
 */
export async function recordPayment(
  orderId: string,
  input: PaymentInput,
): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();

  const doc = await OrderModel.findById(orderId);
  if (!doc) throw notFoundError("Order not found");

  applyPayment(doc, input);
  await doc.save();
  const nowOutstanding = Math.round((doc.totalCharges - doc.paidAmount) * 100) / 100;
  const customer = await CustomerModel.findById(doc.customerId).select("lang");
  if (customer && nowOutstanding <= 0) {
    await notifySettled(customer._id, customer.lang);
  }

  return toView(doc.toObject() as unknown as OrderRow);
}

/**
 * Soft-cancel an order: removes it from the live queue WITHOUT deleting the row.
 *
 * The document, its payments and its status history all survive, so the order
 * stays fully auditable and any cash it collected is still visible — surfaced as
 * `refundDue` on the returned view, because the money now has to go back to the
 * customer rather than being counted as something they still owe.
 *
 * Reachable from any non-collected status. `collected` is rejected because the
 * goods already changed hands, and a second cancel is rejected so the action
 * can't be replayed.
 *
 * Status + cancelledAt + cancelReason + the statusHistory entry are written in
 * ONE `doc.save()`, matching the invariant that a status change, the balance and
 * the timeline can never disagree.
 */
export async function cancelOrder(
  orderId: string,
  input: CancelOrderInput = {},
): Promise<OrderView> {
  await requireSession("owner");
  await connectDb();

  const doc = await OrderModel.findById(orderId);
  if (!doc) throw notFoundError("Order not found");

  if (doc.status === "cancelled") {
    throw new AppError(400, "Order is already cancelled", "ORDER_CANCELLED");
  }
  if (doc.status === "collected") {
    throw new AppError(
      400,
      "Collected orders cannot be cancelled — the goods were already handed over",
      "ORDER_LOCKED",
    );
  }

  const reason = input.reason?.trim();
  doc.status = "cancelled";
  doc.cancelledAt = new Date();
  doc.cancelReason = reason ? reason.slice(0, 200) : undefined;
  doc.statusHistory = [...(doc.statusHistory ?? []), { status: "cancelled", at: doc.cancelledAt }];
  await doc.save();

  const customer = await CustomerModel.findById(doc.customerId).select("lang");
  if (customer) {
    await safelyNotify({
      customerId: doc.customerId,
      type: "orderCancelled",
      messageKey: NOTIF_KEYS.cancelled,
      lang: customer.lang,
    });
  }

  return toView(doc.toObject() as unknown as OrderRow);
}

/**
 * Appends a payment entry to `doc` and raises its paidAmount (mutates in place;
 * caller persists). Rejects zero/negative amounts, over-payment, and any
 * payment against a cancelled order.
 */
function applyPayment(
  doc: {
    status: OrderStatus;
    totalCharges: number;
    paidAmount: number;
    payments: PaymentEntry[];
  },
  payment: PaymentInput | undefined,
): void {
  if (!payment) return;
  if (doc.status === "cancelled") {
    throw new AppError(
      400,
      "Cancelled orders cannot take payments — refund the customer instead",
      "ORDER_CANCELLED",
    );
  }
  const amount = Math.round(payment.amount * 100) / 100;
  if (!(amount > 0)) throw badRequestError("Payment amount must be positive");
  const outstanding = Math.round((doc.totalCharges - doc.paidAmount) * 100) / 100;
  if (amount > outstanding) throw badRequestError("Payment cannot exceed the outstanding balance");
  doc.payments.push({
    amount,
    method: payment.method,
    upiTxnId: payment.method === "upi" ? payment.upiTxnId : undefined,
    recordedAt: new Date(),
  });
  doc.paidAmount = Math.round((doc.paidAmount + amount) * 100) / 100;
}

async function notifySettled(
  customerId: Types.ObjectId,
  lang: "mr" | "en",
): Promise<void> {
  await safelyNotify({
    customerId,
    type: "paymentReceived",
    messageKey: "notif.paymentReceived",
    lang,
  });
}

/* A notification failure must never break an order update. */
async function safelyNotify(
  input: Parameters<typeof notifyCustomer>[0],
): Promise<void> {
  try {
    await notifyCustomer(input);
  } catch (err) {
    console.error("[orders] notification failed", input.type, err);
  }
}

export { ORDER_STATUSES };