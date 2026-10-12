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
  /** Plain-text UPI handle shown alongside the QR (e.g. "ganeshmill@okaxis"). */
  upiId: string;
  /**
   * The mill's single UPI QR, stored VERBATIM as a data URL. Nothing decodes,
   * resizes or re-encodes it — the bytes the owner uploaded are the bytes that
   * reach the customer. Only raster formats are accepted (see `upi-qr` route).
   */
  upiQr: {
    dataUrl: string;
    contentType: string;
    uploadedAt: Date;
  } | null;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    millName: { type: String, default: "Flour Mill" },
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
    upiId: { type: String, default: "", trim: true, maxlength: 100 },
    // Mixed, NOT a nested sub-schema: a sub-schema makes `upiQr: null` fail
    // validation (the child paths are then "required but missing"), which broke
    // EVERY settings save once the field existed. The value is opaque base64
    // plus metadata we never query on, so there is nothing to validate.
    upiQr: { type: Schema.Types.Mixed, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const SettingsModel =
  models.Settings || model<ISettings>("Settings", SettingsSchema);
