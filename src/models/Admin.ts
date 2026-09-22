import { Schema, model, models, type Model } from "mongoose";

export interface Admin {
  name: string;
  email: string;
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<Admin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AdminModel =
  (models.Admin as Model<Admin>) ?? model<Admin>("Admin", AdminSchema);