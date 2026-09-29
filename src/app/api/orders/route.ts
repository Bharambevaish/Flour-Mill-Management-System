import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { createOrderPayloadSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { createOrder, createOrders, listOrders } from "@/services/orderService";
import { ORDER_STATUSES, type OrderStatus } from "@/models/Order";

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession("owner");

    const params = new URL(request.url).searchParams;
    const rawStatus = params.get("status");
    const status: OrderStatus | undefined =
      rawStatus && (ORDER_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as OrderStatus)
        : undefined;
    const excludeCollected = params.get("excludeCollected") === "1";

    const orders = await listOrders({ status, excludeCollected });

    return ok({ orders });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

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
    const parsed = createOrderPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    // Legacy single-line payload (grainType, weightKg, ...) — one order.
    if (!("items" in parsed.data)) {
      const data = parsed.data;
      const order = await createOrder({
        customerId: data.customerId,
        grainType: data.grainType,
        requiredSize: data.requiredSize,
        weightKg: data.weightKg,
        ratePerKg: data.ratePerKg,
        advancePayment:
          data.advanceAmount && data.advanceAmount > 0
            ? {
                amount: data.advanceAmount,
                method: data.advanceMethod!,
                upiTxnId: data.advanceUpiTxnId,
              }
            : undefined,
      });

      audit({
        action: "order.create",
        actor: { actorId, actorKind: "owner" },
        meta: {
          orderId: order.orderId,
          customerId: order.customer?.id,
          weightKg: order.weightKg,
          totalCharges: order.totalCharges,
          advancePaid: order.paidAmount,
        },
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });

      return Response.json({ order }, { status: 201 });
    }

    // New multi-line payload: one customer + several grain bags → N orders.
    const batch = parsed.data;
    const orders = await createOrders({
      customerId: batch.customerId,
      items: batch.items,
      advancePayment:
        batch.advanceAmount && batch.advanceAmount > 0
          ? {
              amount: batch.advanceAmount,
              method: batch.advanceMethod!,
              upiTxnId: batch.advanceUpiTxnId,
            }
          : undefined,
    });

    audit({
      action: "order.create",
      actor: { actorId, actorKind: "owner" },
      meta: {
        orderId: orders[0]?.orderId,
        orderIds: orders.map((o) => o.orderId),
        count: orders.length,
        customerId: orders[0]?.customer?.id,
        batchTotal: orders.reduce((s, o) => s + o.totalCharges, 0),
        advancePaid: orders.reduce((s, o) => s + o.paidAmount, 0),
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return Response.json({ orders }, { status: 201 });
  });
}