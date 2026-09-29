import { handle, ok } from "@/lib/http";
import { requireSession } from "@/services/authService";
import { getReportSummary, resolveRange } from "@/services/reportService";

export const dynamic = "force-dynamic";

/** Owner-only JSON aggregation used by the Reports hub and the round-trip test. */
export async function GET(request: Request) {
  return handle(async () => {
    // Enforced at the route boundary as well as inside getReportSummary: this
    // response carries per-customer dues, so the guard must not depend on a
    // service refactor far below to still exist.
    await requireSession("owner");

    const params = new URL(request.url).searchParams;
    const report = await getReportSummary(resolveRange(params));
    return ok({ report });
  });
}
