import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { COOKIES } from "@/lib/cookies";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { totpCodeSchema } from "@/lib/validation";
import { confirmTotpSetup, requireSession } from "@/services/authService";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

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
    const parsed = totpCodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const store = await cookies();
    const keepRawToken = store.get(COOKIES.ownerSession)?.value;

    await confirmTotpSetup(actorId, parsed.data.code, keepRawToken);

    audit({
      action: "owner.2fa.enable",
      actor: { actorId, actorKind: "owner" },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ enabled: true });
  });
}