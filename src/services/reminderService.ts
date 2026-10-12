import "server-only";

import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { CustomerModel } from "@/models/Customer";
import { NotificationModel } from "@/models/Notification";
import { listOrders } from "@/services/orderService";
import { getSettingsOrDefault } from "@/services/settingsService";
import type { Lang } from "@/lib/i18n";

/**
 * Payment reminders (उधारी आठवण) — the owner taps one button and every
 * customer who still owes money gets a private in-app notice with their own
 * total and order numbers.
 *
 * Amounts are always recomputed here from the orders (`OrderView.outstanding`,
 * the same figure the dashboard and the customer see), never taken from the
 * client. A cancelled order reports 0 outstanding, so it never triggers one.
 */

/** A customer reminded within this window is skipped, so a double-tap (or
 *  "remind all" right after "remind one") never sends the same nag twice. */
export const REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export interface CustomerDueRow {
  customerId: string;
  name: string;
  mobile: string;
  due: number;
  orderNumbers: number[];
  oldestDueAt: string;
  lastRemindedAt: string | null;
  /** Reminded inside the cooldown window, so the server would skip them now. */
  remindedRecently: boolean;
}

/** Everyone who owes money right now, biggest balance first. Owner-only. */
export async function getDuesByCustomer(): Promise<CustomerDueRow[]> {
  const orders = await listOrders(); // enforces the owner session
  const byCustomer = new Map<string, CustomerDueRow>();

  for (const o of orders) {
    if (!o.customer || o.outstanding <= 0) continue;
    const row = byCustomer.get(o.customer.id) ?? {
      customerId: o.customer.id,
      name: o.customer.name,
      mobile: o.customer.mobile,
      due: 0,
      orderNumbers: [],
      oldestDueAt: o.createdAt,
      lastRemindedAt: null,
      remindedRecently: false,
    };
    row.due = Math.round((row.due + o.outstanding) * 100) / 100;
    row.orderNumbers.push(o.orderId);
    if (o.createdAt < row.oldestDueAt) row.oldestDueAt = o.createdAt;
    byCustomer.set(o.customer.id, row);
  }

  const rows = [...byCustomer.values()];
  if (rows.length === 0) return rows;

  // Latest reminder per customer, in one query. (A plain sorted find rather
  // than `$group`/`$max`, so it also runs on Mongo-compatible test servers.)
  const sent = await NotificationModel.find({
    type: "paymentReminder",
    customerId: { $in: rows.map((r) => new Types.ObjectId(r.customerId)) },
  })
    .sort({ sentAt: -1 })
    .select("customerId sentAt")
    .lean<{ customerId: Types.ObjectId; sentAt: Date }[]>();
  const lastBy = new Map<string, Date>();
  for (const n of sent) {
    const key = n.customerId.toString();
    if (!lastBy.has(key)) lastBy.set(key, n.sentAt);
  }
  const now = Date.now();

  for (const r of rows) {
    r.orderNumbers.sort((a, b) => a - b);
    const at = lastBy.get(r.customerId);
    r.lastRemindedAt = at ? new Date(at).toISOString() : null;
    r.remindedRecently = at ? now - new Date(at).getTime() < REMINDER_COOLDOWN_MS : false;
  }

  return rows.sort((a, b) => b.due - a.due || a.name.localeCompare(b.name, "en"));
}

function reminderText(lang: Lang, name: string, due: number, orders: number[], mill: string): string {
  const amount = due.toLocaleString("en-IN");
  const list = orders.map((n) => `#${n}`).join(", ");
  return lang === "mr"
    ? `नमस्कार ${name}, तुमची ₹${amount} उधारी बाकी आहे (ऑर्डर ${list}). कृपया सोयीनुसार लवकर भरा. — ${mill}`
    : `Hello ${name}, you have ₹${amount} outstanding (order ${list}). Please pay at your earliest convenience. — ${mill}`;
}

export interface ReminderResult {
  sent: number;
  /** Reminded within the cooldown window — not sent again. */
  skippedRecent: number;
  /** Asked for, but they owe nothing (or are not a customer). */
  skippedNoDue: number;
  /** The in-app channel is switched off in Settings; nothing was sent. */
  disabled: boolean;
  customerIds: string[];
}

/**
 * Send reminders to `customerIds`, or — when none are given — to everyone who
 * owes money. Deactivated customers are skipped (they cannot log in to read it).
 */
export async function sendPaymentReminders(customerIds?: string[]): Promise<ReminderResult> {
  const dues = await getDuesByCustomer();
  await connectDb();

  const wanted = customerIds && customerIds.length > 0 ? new Set(customerIds) : null;
  const targets = wanted ? dues.filter((d) => wanted.has(d.customerId)) : dues;
  const skippedNoDue = wanted ? wanted.size - targets.length : 0;

  const settings = await getSettingsOrDefault();
  if (settings.notifications.inApp === false) {
    return { sent: 0, skippedRecent: 0, skippedNoDue, disabled: true, customerIds: [] };
  }

  const fresh = targets.filter((d) => !d.remindedRecently);
  const skippedRecent = targets.length - fresh.length;
  if (fresh.length === 0) {
    return { sent: 0, skippedRecent, skippedNoDue, disabled: false, customerIds: [] };
  }

  const customers = await CustomerModel.find({
    _id: { $in: fresh.map((d) => new Types.ObjectId(d.customerId)) },
    active: true,
  })
    .select("lang")
    .lean<{ _id: Types.ObjectId; lang?: Lang }[]>();
  const langBy = new Map(customers.map((c) => [c._id.toString(), c.lang ?? "mr"]));

  const sentAt = new Date();
  const docs = fresh
    .filter((d) => langBy.has(d.customerId))
    .map((d) => {
      const lang = langBy.get(d.customerId) as Lang;
      return {
        customerId: new Types.ObjectId(d.customerId),
        type: "paymentReminder" as const,
        message: reminderText(lang, d.name, d.due, d.orderNumbers, settings.millName),
        lang,
        channels: ["inApp"],
        sentAt,
        readAt: null,
        createdAt: sentAt,
      };
    });

  if (docs.length > 0) await NotificationModel.insertMany(docs);

  return {
    sent: docs.length,
    skippedRecent,
    skippedNoDue: skippedNoDue + (fresh.length - docs.length),
    disabled: false,
    customerIds: docs.map((d) => d.customerId.toString()),
  };
}
