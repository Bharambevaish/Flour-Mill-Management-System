import { Schema, model, models } from "mongoose";

export interface ISettings {
  millName: string;
  phone: string;
  address: string;
  currency: string;
  defaultLanguage: "mr" | "en";
  rates: Record<string, Record<string, number>>;
  notifications: {
    inApp: boolean;
    webPush: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    millName: { type: String, default: "श्री गणेश फिड मील (Flour Mill)" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    currency: { type: String, default: "₹" },
    defaultLanguage: { type: String, enum: ["mr", "en"], default: "mr" },
    rates: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {
        maize: { fine: 8, medium: 6, coarse: 5 },
        wheat: { fine: 7, medium: 5, coarse: 4 },
        jowar: { fine: 6, medium: 5, coarse: 4 },
        bajra: { fine: 6, medium: 5, coarse: 4 },
        rice: { fine: 8, medium: 7, coarse: 6 },
        gram: { fine: 9, medium: 7, coarse: 6 },
        other: { fine: 6, medium: 5, coarse: 4 },
      },
    },
    notifications: {
      inApp: { type: Boolean, default: true },
      webPush: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SettingsModel =
  models.Settings || model<ISettings>("Settings", SettingsSchema);
