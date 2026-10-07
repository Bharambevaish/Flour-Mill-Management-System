import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { createPaymentClaimSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import {
  createPaymentClaim,
  listPaymentClaimsForCustomer,
} from "@/services/paymentClaimService";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";

/** Customer: report a payment done via QR / UPI with UTR / receipt */
export async function POST(request: Request) {
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

    const customerId = (await requireSession("customer")) as Types.ObjectId;
    const body = await readBody(request);
    const parsed = createPaymentClaimSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid payment report data", "VALIDATION");
    }

    const claim = await createPaymentClaim({
      customerId,
      orderId: parsed.data.orderId,
      amount: parsed.data.amount,
      upiTxnId: parsed.data.upiTxnId,
      receiptImage: parsed.data.receiptImage,
      notes: parsed.data.notes,
    });

    audit({
      action: "payment.claim.create",
      actor: { actorId: customerId.toString(), actorKind: "customer" },
      meta: {
        claimId: claim.id,
        orderId: claim.orderId,
        orderNumber: claim.orderNumber,
        amount: claim.amount,
        upiTxnId: claim.upiTxnId,
        hasReceipt: !!claim.receiptImage,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ claim });
  });
}

/** Customer: view own submitted payment claims */
export async function GET() {
  return handle(async () => {
    const customerId = (await requireSession("customer")) as Types.ObjectId;
    const claims = await listPaymentClaimsForCustomer(customerId);
    return ok({ claims });
  });
}
