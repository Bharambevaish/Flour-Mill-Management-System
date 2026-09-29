import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { updateCustomerSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { updateCustomer } from "@/services/customerService";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);
    const { id } = await context.params;

    const rate = checkRate(
      ownerMutationKey("customers", ip),
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
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const customer = await updateCustomer(id, parsed.data);

    audit({
      action: parsed.data.active === false ? "customer.deactivate" : parsed.data.active === true ? "customer.activate" : "customer.update",
      actor: { actorId, actorKind: "owner" },
      meta: { customerId: customer.id, name: customer.name, mobile: customer.mobile },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return ok({ customer });
  });
}