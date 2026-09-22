import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";
import { connectDb } from "@/lib/db";
import { verifyCsrf } from "@/lib/csrf";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { requireSession } from "@/services/authService";
import { runDemoSeed } from "@/services/demoSeedService";

export const dynamic = "force-dynamic";

/**
 * Manual demo-data seeder (test button, top-right on owner pages).
 * Owner-only, CSRF-protected, and refuses to run in production builds —
 * it wipes orders + notifications, so it must never be reachable live.
 */
export async function POST(request: Request) {
  return handle(async () => {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(404, "Not found", "NOT_FOUND");
    }

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

    await connectDb();
    const summary = await runDemoSeed();

    audit({
      action: "demo.seed",
      actor: { actorId, actorKind: "owner" },
      meta: summary as unknown as Record<string, unknown>,
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ summary });
  });
}