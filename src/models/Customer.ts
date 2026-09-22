import { Schema, model, models, type Model } from "mongoose";
import type { Lang } from "@/lib/i18n";

export interface Customer {
  name: string;
  mobile: string;
  pinHash: string;
  mustChangePin: boolean;
  active: boolean;
  lang: Lang;
  /** Consecutive failed PIN attempts since the last success (brute-force guard). */
  failedPinAttempts: number;
  /** Locked until this time after repeated failures (progressive). */
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<Customer>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, index: true, trim: true },
    pinHash: { type: String, required: true },
    mustChangePin: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    lang: { type: String, enum: ["mr", "en"], default: "mr" },
    failedPinAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export const CustomerModel =
  (models.Customer as Model<Customer>) ?? model<Customer>("Customer", CustomerSchema);