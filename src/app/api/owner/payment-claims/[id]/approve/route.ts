import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { requireSession } from "@/services/authService";
import { approvePaymentClaim } from "@/services/paymentClaimService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner: approve customer payment claim and record payment */
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
    const claim = await approvePaymentClaim(id, actorId);

    audit({
      action: "payment.claim.approve",
      actor: { actorId, actorKind: "owner" },
      meta: {
        claimId: claim.id,
        orderId: claim.orderId,
        orderNumber: claim.orderNumber,
        amount: claim.amount,
        upiTxnId: claim.upiTxnId,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ claim });
  });
}
