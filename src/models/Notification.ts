import { Schema, model, models, type Model, type Types } from "mongoose";
import type { Lang } from "@/lib/i18n";

export type NotificationType =
  | "orderReceived"
  | "orderProcessing"
  | "orderCompleted"
  | "orderCollected"
  | "orderCancelled"
  | "paymentReceived"
  | "paymentDue"
  | "paymentReminder"
  | "broadcast";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "orderReceived",
  "orderProcessing",
  "orderCompleted",
  "orderCollected",
  "orderCancelled",
  "paymentReceived",
  "paymentDue",
  "paymentReminder",
  "broadcast",
];

export type NotificationChannel = "inApp" | "push" | "sms" | "whatsapp";

export interface Notification {
  customerId: Types.ObjectId | null; // null = broadcast/internal
  type: NotificationType;
  message: string;
  lang: Lang;
  channels: NotificationChannel[];
  sentAt: Date;
  readAt: Date | null;
  createdAt: Date;
}

const NotificationSchema = new Schema<Notification>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    lang: { type: String, enum: ["mr", "en"], default: "mr" },
    channels: { type: [String], enum: ["inApp", "push", "sms", "whatsapp"], default: ["inApp"] },
    sentAt: { type: Date, default: Date.now, index: true },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export const NotificationModel =
  (models.Notification as Model<Notification>) ??
  model<Notification>("Notification", NotificationSchema);