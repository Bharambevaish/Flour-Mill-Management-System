import { handle, ok } from "@/lib/http";
import { requireSession } from "@/services/authService";
import { getCustomerDashboard } from "@/services/customerDashboardService";

export const dynamic = "force-dynamic";

/**
 * Read-only customer dashboard snapshot: everything is scoped to the session's
 * own customerId — no customer id ever comes from the URL or body, so there is
 * no cross-customer access surface (no IDOR).
 */
export const GET = () =>
  handle(async () => {
    const customerId = (await requireSession("customer")).toString();
    const dashboard = await getCustomerDashboard(customerId);
    return ok({ dashboard });
  });