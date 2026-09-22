import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { orderTransitionSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { transitionOrder } from "@/services/orderService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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
    const parsed = orderTransitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const order = await transitionOrder(id, {
      status: parsed.data.status,
      payment: parsed.data.payment,
    });

    audit({
      action: `order.status.${order.status}`,
      actor: { actorId, actorKind: "owner" },
      meta: {
        orderId: order.orderId,
        status: order.status,
        paidAmount: order.paidAmount,
        method: parsed.data.payment?.method,
        upiTxnId: parsed.data.payment?.upiTxnId,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ order });
  });
}