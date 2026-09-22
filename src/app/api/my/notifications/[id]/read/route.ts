import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { requireSession } from "@/services/authService";
import { markNotificationRead } from "@/services/notificationService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Mark ONE of the caller's own notifications read. The update filters by
 * `{ _id, customerId }`, and a hit/miss is deliberately indistinguishable
 * (always 200) so an attacker can't use this as an existence oracle for other
 * customers' notification ids.
 */
export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);
    const rate = checkRate(
      `customer-mutation:${ip}`,
      RATE_LIMITS.generalMutation.limit,
      RATE_LIMITS.generalMutation.windowMs,
    );
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    const customerId = (await requireSession("customer")) as import("mongoose").Types.ObjectId;
    const { id } = await context.params;

    const updated = await markNotificationRead(id, customerId);
    audit({
      action: updated ? "notification.read" : "notification.read.noop",
      actor: { actorId: customerId.toString(), actorKind: "customer" },
      meta: { notificationId: id },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ updated });
  });
}