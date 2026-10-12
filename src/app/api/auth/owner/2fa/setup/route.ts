import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { handle, ok } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { createTotpSetup, requireSession } from "@/services/authService";
import { getSettingsOrDefault } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const settings = await getSettingsOrDefault();
    const issuer = settings.millName || "Flour Mill";

    const setup = await createTotpSetup(actorId, issuer);

    audit({
      action: "owner.2fa.setup",
      actor: { actorId, actorKind: "owner" },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok(setup as unknown as Record<string, unknown>);
  });
}