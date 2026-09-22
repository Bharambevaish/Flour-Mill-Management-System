import "server-only";

import { connectDb } from "@/lib/db";
import { t, type Lang } from "@/lib/i18n";
import {
  NotificationModel,
  type NotificationChannel,
  type NotificationType,
} from "@/models/Notification";
import { getSettingsOrDefault } from "@/services/settingsService";
import { CustomerModel } from "@/models/Customer";
import { Types } from "mongoose";

const ACTIVE_CHANNELS: NotificationChannel[] = ["inApp"]; // push/sms/whatsapp phased in later

/**
 * Day-1 notification service. All channels fan out through this one function,
 * so phase-2 providers (MSG91 SMS, Meta WhatsApp, web push) plug in here
 * without changing call sites.
 */
export async function notifyCustomer(input: {
  customerId: Types.ObjectId;
  type: NotificationType;
  messageKey: string;
  lang: Lang;
  channels?: NotificationChannel[];
}): Promise<void> {
  await connectDb();

  // The in-app tray can be switched off in Settings; nothing fan out when off.
  const prefs = await getSettingsOrDefault()
    .then((s) => s.notifications)
    .catch(() => null);
  if (prefs && prefs.inApp === false) return;

  const channels = (input.channels ?? ACTIVE_CHANNELS).filter((c) =>
    ACTIVE_CHANNELS.includes(c),
  );
  if (channels.length === 0) return;

  await NotificationModel.create({
    customerId: input.customerId,
    type: input.type,
    message: t(input.messageKey, input.lang),
    lang: input.lang,
    channels,
    sentAt: new Date(),
    readAt: null,
    createdAt: new Date(),
  });

  // Phase 2 hooks:
  //   if (channels.includes('sms'))      -> sendSms(customer, message)
  //   if (channels.includes('whatsapp')) -> sendWhatsApp(customer, message)
  //   if (channels.includes('push'))     -> sendWebPush(customer, message)
  void channels;
}

/** Mark a single notification read (customer dashboard). */
export async function markNotificationRead(
  notificationId: string,
  customerId: Types.ObjectId,
): Promise<boolean> {
  await connectDb();
  const res = await NotificationModel.updateOne(
    { _id: notificationId, customerId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return res.modifiedCount > 0;
}

/** Mark every unread notification of a customer as read. Returns count marked. */
export async function markAllNotificationsRead(
  customerId: Types.ObjectId,
): Promise<number> {
  await connectDb();
  const res = await NotificationModel.updateMany(
    { customerId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return res.modifiedCount;
}

export interface CustomerNotificationView {
  id: string;
  type: NotificationType;
  message: string;
  lang: Lang;
  read: boolean;
  sentAt: string;
}

/** This customer's notification feed, newest first (capped). */
export async function listNotificationsForCustomer(
  customerId: Types.ObjectId,
  limit = 100,
): Promise<CustomerNotificationView[]> {
  await connectDb();
  const docs = await NotificationModel.find({ customerId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((n) => ({
    id: String(n._id),
    type: n.type,
    message: n.message,
    lang: n.lang,
    read: !!n.readAt,
    sentAt: n.sentAt instanceof Date ? n.sentAt.toISOString() : String(n.sentAt),
  }));
}

export async function unreadNotificationCount(customerId: Types.ObjectId): Promise<number> {
  await connectDb();
  return NotificationModel.countDocuments({ customerId, readAt: null });
}

/** Fan a free-text message out to the chosen customers (one private row each). */
export async function sendCustomersMessage(input: {
  customerIds: Types.ObjectId[];
  message: string;
  lang: Lang;
}): Promise<number> {
  await connectDb();

  const prefs = await getSettingsOrDefault()
    .then((s) => s.notifications)
    .catch(() => null);
  if (prefs && prefs.inApp === false) return 0;

  const ids = [...new Set(input.customerIds.map((c) => c.toString()))].map(
    (s) => new Types.ObjectId(s),
  );
  if (ids.length === 0) return 0;

  const now = new Date();
  await NotificationModel.insertMany(
    ids.map((id) => ({
      customerId: id,
      type: "broadcast" as const,
      message: input.message,
      lang: input.lang,
      channels: ["inApp"] as NotificationChannel[],
      sentAt: now,
      readAt: null,
      createdAt: now,
    })),
  );
  return ids.length;
}

/**
 * Owner broadcast: fan the same free-text announcement out to every ACTIVE
 * customer, one in-app Notification row per customer (each tagged with its
 * customerId so the customer inbox picks it up). Each row is private to its
 * recipient — no customer ever sees who else was messaged. Honours the master
 * "in-app notifications" switch — when it's off, nothing is delivered.
 */
export async function broadcastToActiveCustomers(input: {
  message: string;
  lang: Lang;
}): Promise<number> {
  await connectDb();
  const customers = await CustomerModel.find({ active: true }).select("_id").lean();
  if (customers.length === 0) return 0;
  return sendCustomersMessage({
    customerIds: customers.map((c) => c._id as Types.ObjectId),
    message: input.message,
    lang: input.lang,
  });
}