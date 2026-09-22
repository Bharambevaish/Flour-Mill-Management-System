import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { broadcastNotificationSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { Types } from "mongoose";
import { broadcastToActiveCustomers, sendCustomersMessage } from "@/services/notificationService";

export const dynamic = "force-dynamic";

/**
 * Owner announcement: send to every active customer, OR to the specific
 * customers listed in `customerIds`. Each recipient gets one private in-app row
 * — no customer ever sees who else was messaged or any balances. Fan-out only
 * (no WhatsApp/SMS). CSRF + rate-limited + audited.
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

    const { message, lang, customerIds } = parsed.data;
    const targeted =
      customerIds && customerIds.length > 0
        ? await sendCustomersMessage({
            customerIds: customerIds.map((id) => new Types.ObjectId(id)),
            message,
            lang,
          })
        : await broadcastToActiveCustomers({ message, lang });

    audit({
      action: "notifications.broadcast",
      actor: { actorId, actorKind: "owner" },
      meta: {
        customers: targeted,
        lang,
        targeted: targeted ? (customerIds?.length ?? 0) > 0 : false,
        message: message.slice(0, 80),
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ count: targeted });
  });
}