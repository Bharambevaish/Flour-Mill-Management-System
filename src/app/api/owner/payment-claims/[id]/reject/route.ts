import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { rejectPaymentClaimSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { rejectPaymentClaim } from "@/services/paymentClaimService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner: reject customer payment claim with reason */
export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);
    const { id } = await context.params;

    const rate = checkRate(
      ownerMutationKey("payments", ip),
      RATE_LIMITS.generalMutation.limit,
      RATE_LIMITS.generalMutation.windowMs,
    );
    if (!rate.ok) {
      return Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests, try later",
            retryAfter: rate.retryAfterSeconds,
          },
        },
        { status: 429 },
      );
    }

    const actorId = (await requireSession("owner")).toString();
    const body = await readBody(request);
    const parsed = rejectPaymentClaimSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Reason is required", "VALIDATION");
    }

    const claim = await rejectPaymentClaim(id, actorId, parsed.data.reason);

    audit({
      action: "payment.claim.reject",
      actor: { actorId, actorKind: "owner" },
      meta: {
        claimId: claim.id,
        orderId: claim.orderId,
        orderNumber: claim.orderNumber,
        amount: claim.amount,
        reason: parsed.data.reason,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ claim });
  });
}
