import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { paymentReminderSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { sendPaymentReminders } from "@/services/reminderService";

export const dynamic = "force-dynamic";

/**
 * Owner → payment reminder (उधारी आठवण). Body `{ customerIds?: string[] }`;
 * omitted/empty = everyone who currently owes money. Amounts are recomputed
 * server-side; a customer reminded in the last few hours is skipped.
 * CSRF + rate-limited + audited, like every other owner mutation.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(
      ownerMutationKey("notifications", ip),
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

    const parsed = paymentReminderSchema.safeParse(await readBody(request));
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const result = await sendPaymentReminders(parsed.data.customerIds);

    audit({
      action: "notifications.paymentReminder",
      actor: { actorId, actorKind: "owner" },
      meta: {
        sent: result.sent,
        skippedRecent: result.skippedRecent,
        skippedNoDue: result.skippedNoDue,
        disabled: result.disabled,
        all: !parsed.data.customerIds?.length,
      },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ ...result });
  });
}
