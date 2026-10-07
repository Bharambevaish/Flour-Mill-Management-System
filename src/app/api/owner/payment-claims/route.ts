import { handle, ok } from "@/lib/http";
import { requireSession } from "@/services/authService";
import { listPendingPaymentClaims } from "@/services/paymentClaimService";

export const dynamic = "force-dynamic";

/** Owner: list all pending payment claims from customers */
export async function GET() {
  return handle(async () => {
    await requireSession("owner");
    const claims = await listPendingPaymentClaims();
    return ok({ claims });
  });
}
