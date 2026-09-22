import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { broadcastNotificationSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { broadcastToActiveCustomers } from "@/services/notificationService";

export const dynamic = "force-dynamic";

/**
 * Owner broadcast: send one announcement to every active customer.
 * Fan-out only — no WhatsApp/SMS currently. CSRF + rate-limited + audited.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(
      `owner-mutation:${ip}`,
      RATE_LIMITS.generalMutation.limit,
      RATE_LIMITS.generalMutation.windowMs,
    );
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    const actorId = (await requireSession("owner")).toString();

    const body = await readBody(request);
    const parsed = broadcastNotificationSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const { message, lang } = parsed.data;
    const count = await broadcastToActiveCustomers({ message, lang });

    audit({
      action: "notifications.broadcast",
      actor: { actorId, actorKind: "owner" },
      meta: { customers: count, lang, message: message.slice(0, 80) },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ count });
  });
}