import { Schema, model, models, type Model, type Types } from "mongoose";
import type { SessionKind } from "@/lib/cookies";

export interface Session {
  tokenHash: string;
  kind: SessionKind;
  refId: Types.ObjectId;
  device: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

const SessionSchema = new Schema<Session>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ["owner", "customer"], required: true, index: true },
    refId: { type: Schema.Types.ObjectId, required: true, index: true },
    device: { type: String, default: "" },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

export const SessionModel =
  (models.Session as Model<Session>) ?? model<Session>("Session", SessionSchema);