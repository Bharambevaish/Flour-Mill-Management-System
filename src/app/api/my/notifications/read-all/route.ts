import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { requireSession } from "@/services/authService";
import { markAllNotificationsRead } from "@/services/notificationService";

export const dynamic = "force-dynamic";

/** Mark every unread notification of the caller as read (session-scoped). */
export async function PATCH(request: Request) {
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
    const marked = await markAllNotificationsRead(customerId);
    audit({
      action: "notification.readAll",
      actor: { actorId: customerId.toString(), actorKind: "customer" },
      meta: { marked },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ marked });
  });
}