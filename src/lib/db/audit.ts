import "server-only";

import { Types } from "mongoose";

import { connectDb } from "@/lib/db";
import { AuditLogModel } from "@/models/AuditLog";

export type AuditActor = {
  /** Free-form actor id; only valid ObjectIds are stored. Use "system" for none. */
  actorId: string | null;
  actorKind: "owner" | "customer" | "system";
};

export interface AuditArgs {
  action: string;
  actor: AuditActor;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Append an audit record. Fire-and-forget: never blocks the business flow.
 *
 * actorId is sanitized: only valid Mongo ObjectIds are stored, so a bad value
 * at a call site can never crash the request (it degrades to a system record).
 */
export function audit(args: AuditArgs): void {
  void (async () => {
    try {
      await connectDb();
      const actorId =
        args.actor.actorId && Types.ObjectId.isValid(args.actor.actorId)
          ? new Types.ObjectId(args.actor.actorId)
          : null;

      await AuditLogModel.create({
        actorId,
        actorKind: args.actor.actorKind,
        action: args.action,
        meta: args.meta ?? null,
        ip: args.ip,
        userAgent: args.userAgent,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("[audit] failed to write", args.action, err);
    }
  })();
}