import { Schema, model, models, type Model, type Types } from "mongoose";

export interface AuditLog {
  actorId: Types.ObjectId | null;
  actorKind: "owner" | "customer" | "system";
  action: string;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, default: null, index: true },
    actorKind: { type: String, enum: ["owner", "customer", "system"], required: true },
    action: { type: String, required: true, index: true },
    meta: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

// Compound index for "what did actor X do recently"
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog>) ?? model<AuditLog>("AuditLog", AuditLogSchema);