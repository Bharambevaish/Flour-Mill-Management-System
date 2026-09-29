import { toCsv, type CsvValue } from "@/lib/csv";
import { AppError } from "@/lib/errors";
import { handle } from "@/lib/http";
import { formatDateTime, getLang } from "@/lib/i18n/i18n";
import { grainLabel } from "@/lib/millings";
import { requireSession } from "@/services/authService";
import { getReportSummary, resolveRange } from "@/services/reportService";

export const dynamic = "force-dynamic";

const SECTIONS = ["receipts", "grain", "customers", "summary"] as const;
type Section = (typeof SECTIONS)[number];

/** Build headers + rows for one section of the report as a CSV payload. */
function buildCsv(
  section: Section,
  report: Awaited<ReturnType<typeof getReportSummary>>,
  lang: "mr" | "en",
): { headers: string[]; rows: CsvValue[][]; name: string } {
  const mr = lang === "mr";
  switch (section) {
    case "grain":
      return {
        name: "grain",
        headers: [mr ? "धान्य" : "Grain", mr ? "ऑर्डर" : "Orders", mr ? "वजन (किलो)" : "Weight (kg)", mr ? "आकारणी (₹)" : "Charges (₹)"],
        rows: report.byGrain.map((g) => [grainLabel(g.grainType, lang), g.orders, g.weightKg, g.totalCharges]),
      };
    case "customers":
      return {
        name: "customers",
        headers: [
          mr ? "ग्राहक" : "Customer",
          mr ? "मोबाईल" : "Mobile",
          mr ? "ऑर्डर" : "Orders",
          mr ? "एकूण आकारणी (₹)" : "Total Charges (₹)",
          mr ? "वसूल (₹)" : "Paid (₹)",
          mr ? "उधारी (₹)" : "Outstanding (₹)",
          mr ? "या कालावधीत वसूल (₹)" : "Collected in Period (₹)",
          // Always exported (unlike the on-screen column) so a spreadsheet can
          // be reconciled against the mill's actual cash position.
          mr ? "परत द्यायची रक्कम (₹)" : "Refund Due (₹)",
        ],
        rows: report.customers.map((c) => [
          c.name,
          c.mobile,
          c.orders,
          c.totalCharges,
          c.paid,
          c.outstanding,
          c.collectedInPeriod,
          c.refundPending,
        ]),
      };
    case "summary":
      return {
        name: "summary",
        headers: [mr ? "निर्देशक" : "Metric", mr ? "मूल्य" : "Value"],
        rows: [
          [mr ? "ऑर्डर तयार" : "Orders created", report.activity.ordersCreated],
          [mr ? "एकूण वजन (किलो)" : "Total weight (kg)", report.activity.weightKg],
          [mr ? "एकूण आकारणी (₹)" : "Total charges (₹)", report.activity.totalCharges],
          [mr ? "वसूल (₹)" : "Collected (₹)", report.activity.collected],
          [mr ? "रोख (₹)" : "Cash (₹)", report.byMethod.cash],
          [mr ? "UPI (₹)" : "UPI (₹)", report.byMethod.upi],
          [mr ? "नवीन ऑर्डरवरील उधारी (₹)" : "Outstanding on new orders (₹)", report.activity.outstandingOnNewOrders],
        ],
      };
    case "receipts":
    default:
      return {
        name: "receipts",
        headers: [
          mr ? "ऑर्डर क्र." : "Order #",
          mr ? "दिनांक" : "Date",
          mr ? "ग्राहक" : "Customer",
          mr ? "मोबाईल" : "Mobile",
          mr ? "पद्धत" : "Method",
          mr ? "UPI व्यवहार" : "UPI Txn",
          mr ? "रक्कम (₹)" : "Amount (₹)",
        ],
        rows: report.receipts.map((r) => [
          r.orderId,
          formatDateTime(r.recordedAt, lang),
          r.customer,
          r.mobile,
          r.method === "upi" ? "UPI" : mr ? "रोख" : "Cash",
          r.upiTxnId ?? "",
          r.amount,
        ]),
      };
  }
}

/** Owner-only CSV download: `?section=receipts|grain|customers|summary`. */
export async function GET(request: Request) {
  return handle(async () => {
    // Auth FIRST, before any input handling: an unauthenticated caller must not
    // be able to tell a valid ?section= from an invalid one (which would leak
    // the section list), and this export contains customer names, mobiles,
    // per-customer dues and UPI transaction ids.
    await requireSession("owner");

    const params = new URL(request.url).searchParams;
    const rawSection = params.get("section");
    if (rawSection && !(SECTIONS as readonly string[]).includes(rawSection)) {
      throw new AppError(400, "Unknown report section", "VALIDATION");
    }
    const section: Section = (rawSection as Section) ?? "receipts";

    const [range, lang] = await Promise.all([Promise.resolve(resolveRange(params)), getLang()]);
    const report = await getReportSummary(range);
    const { headers, rows, name } = buildCsv(section, report, lang);

    const stamp = report.range.to.slice(0, 10);
    const filename = `flour-mill-${name}-${stamp}.csv`;

    return new Response(toCsv(headers, rows), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  });
}
