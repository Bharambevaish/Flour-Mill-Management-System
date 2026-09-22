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
import type { Types } from "mongoose";

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

/**
 * Owner broadcast: fan the same free-text announcement out to every ACTIVE
 * customer, one in-app Notification row per customer (each tagged with its
 * customerId so the future customer inbox picks it up). Honours the master
 * "in-app notifications" switch — when it's off, nothing is delivered.
 */
export async function broadcastToActiveCustomers(input: {
  message: string;
  lang: Lang;
}): Promise<number> {
  await connectDb();

  const prefs = await getSettingsOrDefault()
    .then((s) => s.notifications)
    .catch(() => null);
  if (prefs && prefs.inApp === false) return 0;

  const customers = await CustomerModel.find({ active: true }).select("_id").lean();
  if (customers.length === 0) return 0;

  const now = new Date();
  await NotificationModel.insertMany(
    customers.map((c) => ({
      customerId: c._id,
      type: "broadcast" as const,
      message: input.message,
      lang: input.lang,
      channels: ["inApp"] as NotificationChannel[],
      sentAt: now,
      readAt: null,
      createdAt: now,
    })),
  );
  return customers.length;
}