import { audit } from "@/lib/audit";
import { issueCsrf, verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, RATE_LIMITS } from "@/lib/rate-limit";
import { clientContext, clientIp } from "@/lib/request-context";
import { customerLoginSchema } from "@/lib/validation";
import { loginCustomer, persistSessionCookie } from "@/services/authService";

export const dynamic = "force-dynamic";

export const POST = (request: Request) =>
  handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

    const body = await readBody(request);
    const parsed = customerLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }
    const mobile = parsed.data.mobile.replace(/\s+/g, "").trim();

    const rate = checkRate(`customer-login:${mobile}:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
    if (!rate.ok) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many attempts, try later", retryAfter: rate.retryAfterSeconds } },
        { status: 429 },
      );
    }

    try {
      const { customer, session } = await loginCustomer(parsed.data, clientContext(request));
      await persistSessionCookie("customer", session.token);
      const csrfToken = await issueCsrf();
      audit({
        action: "login",
        actor: { actorId: customer._id.toString(), actorKind: "customer" },
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        meta: { mobile },
      });
      return ok({ user: { id: customer._id, name: customer.name, mobile: customer.mobile }, csrfToken });
    } catch (error) {
      audit({
        action: "login.failed",
        actor: { actorId: "unknown", actorKind: "customer" },
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        meta: { mobile },
      });
      throw error;
    }
  });