import { audit } from "@/lib/audit";
import { issueCsrf, verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { RATE_LIMITS, checkRate } from "@/lib/rate-limit";
import { clientContext, clientIp } from "@/lib/request-context";
import { ownerLoginSchema } from "@/lib/validation";
import {
  loginOwner,
  persistSessionCookie,
} from "@/services/authService";

export const dynamic = "force-dynamic";

export const POST = (request: Request) =>
  handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const rate = checkRate(`owner-login:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many attempts, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    const body = await readBody(request);
    const parsed = ownerLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    try {
      const { admin, session, needTotp } = await loginOwner(
        parsed.data,
        clientContext(request),
        parsed.data.totpCode,
      );

      // Credentials are correct but TOTP is enabled and no code was sent yet:
      // do NOT create a session — ask the client for the second factor.
      if (needTotp || !session) {
        audit({
          action: "login.pending2fa",
          actor: { actorId: admin._id.toString(), actorKind: "owner" },
          ip,
          userAgent: request.headers.get("user-agent") ?? undefined,
          meta: { email: admin.email },
        });
        return ok({
          needTotp: true,
          user: { id: admin._id, name: admin.name, email: admin.email },
        });
      }

      await persistSessionCookie("owner", session.token);
      const csrfToken = await issueCsrf(); // rotate CSRF token on login
      audit({
        action: "login",
        actor: { actorId: admin._id.toString(), actorKind: "owner" },
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        meta: { ok: true },
      });
      return ok({ user: { id: admin._id, name: admin.name, email: admin.email }, csrfToken });
    } catch (error) {
      audit({
        action: "login.failed",
        actor: { actorId: "unknown", actorKind: "owner" },
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        meta: { email: parsed.data.email, reason: "credentials" },
      });
      throw error;
    }
  });