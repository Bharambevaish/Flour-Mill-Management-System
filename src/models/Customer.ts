import { Schema, model, models, type Model } from "mongoose";
import type { Lang } from "@/lib/i18n";

export interface Customer {
  name: string;
  mobile: string;
  pinHash: string;
  mustChangePin: boolean;
  active: boolean;
  lang: Lang;
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
  },
  { timestamps: true },
);

export const CustomerModel =
  (models.Customer as Model<Customer>) ?? model<Customer>("Customer", CustomerSchema);