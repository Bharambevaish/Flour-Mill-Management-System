import { audit } from "@/lib/audit";
import { verifyCsrf } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { handle, ok, readBody } from "@/lib/http";
import { checkRate, ownerMutationKey, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-context";
import { createCustomerSchema } from "@/lib/validation";
import { requireSession } from "@/services/authService";
import { createCustomer, listCustomers } from "@/services/customerService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession("owner");

    const search = new URL(request.url).searchParams.get("q") ?? undefined;
    const customers = await listCustomers(search);
    return ok({ customers });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await verifyCsrf(request);
    const ip = clientIp(request);

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
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(400, "Invalid input", "VALIDATION");
    }

    const customer = await createCustomer(parsed.data);

    audit({
      action: "customer.create",
      actor: { actorId, actorKind: "owner" },
      meta: { customerId: customer.id, name: customer.name, mobile: customer.mobile },
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return Response.json({ customer }, { status: 201 });
  });
}