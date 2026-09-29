import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { cancelOrderSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { cancelOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Soft-cancel an order.
 *
 * Deliberately a POST to `/cancel` and NOT a `DELETE` on the order: "delete" is
 * exactly the mental model that makes people expect the record to vanish, and
 * nothing is ever deleted here. The payments and status history survive and stay
 * visible under the Queue page's Cancelled tab.
 */
export async function POST(request: Request, context: RouteContext) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);
    const { id } = await context.params;

    const rate = checkRate(
      ownerMutationKey("orders", ip),
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
    const parsed = cancelOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const order = await cancelOrder(id, parsed.data);

    audit({
      action: "order.cancel",
      actor: { actorId, actorKind: "owner" },
      meta: {
        orderId: order.orderId,
        customerId: order.customer?.id,
        reason: parsed.data.reason,
        // Non-zero means the mill is holding cash that now has to go back.
        refundDue: order.refundDue,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ order });
  });
}
