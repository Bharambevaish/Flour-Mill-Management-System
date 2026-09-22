import { handle, ok } from "@/lib/http";
import { getReportSummary, resolveRange } from "@/services/reportService";

export const dynamic = "force-dynamic";

/** Owner-only JSON aggregation used by the Reports hub and the round-trip test. */
export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const report = await getReportSummary(resolveRange(params));
    return ok({ report });
  });
}
