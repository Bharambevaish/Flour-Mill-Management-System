import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { COOKIES } from "@/lib/cookies";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { changeOwnerPasswordSchema } from "@/lib/validation";
import { changeOwnerPassword, requireSession } from "@/services/authService";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(
      ownerMutationKey("settings", ip),
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
    const parsed = changeOwnerPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const store = await cookies();
    const keepRawToken = store.get(COOKIES.ownerSession)?.value;

    await changeOwnerPassword(
      actorId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      keepRawToken,
    );

    audit({
      action: "owner.password.change",
      actor: { actorId, actorKind: "owner" },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ changed: true });
  });
}