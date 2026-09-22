import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { recordPaymentSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { recordPayment } from "@/services/orderService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Record a payment against an order (cash/UPI). Works on ANY order state —
 * including collected orders where the customer settles their उधारी later.
 * Never touches the order status.
 */
export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);
    const { id } = await context.params;

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
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const order = await recordPayment(id, parsed.data);

    audit({
      action: "order.payment.record",
      actor: { actorId, actorKind: "owner" },
      meta: {
        orderId: order.orderId,
        amount: parsed.data.amount,
        method: parsed.data.method,
        upiTxnId: parsed.data.upiTxnId,
        paidAmount: order.paidAmount,
        outstandingAfter: Math.round((order.totalCharges - order.paidAmount) * 100) / 100,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ order });
  });
}