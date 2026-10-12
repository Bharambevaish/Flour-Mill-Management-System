import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang, formatLang } from "@/lib/i18n/i18n";
import { getReportSummary, resolveRange } from "@/services/reportService";
import { ReportActions, ReportRangePicker, ReportsSummary } from "@/components/owner/reports";

export const dynamic = "force-dynamic";

function localDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connectDb();
  await requirePageSession("owner");
  const [lang, sp] = await Promise.all([getLang(), searchParams]);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string" && value) params.set(key, value);
  }

  const range = resolveRange(params);
  const report = await getReportSummary(range);
  const query = params.toString() || "preset=30d";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-earth-900 dark:text-earth-100 font-display">
            {formatLang({ mr: "अहवाल व निर्यात", en: "Reports & Export" }, lang)}
          </h1>
          <p className="text-sm text-earth-500 dark:text-earth-400">
            {formatLang(
              {
                mr: "कालावधीनुसार व्यवसाय, धान्य, वसूल व उधारी — CSV डाउनलोड किंवा प्रिंट/PDF",
                en: "Period business, grain, collections and dues — download CSV or print/PDF",
              },
              lang
            )}
          </p>
        </div>
        <ReportActions query={query} lang={lang} />
      </header>

      <ReportRangePicker
        preset={report.range.preset}
        from={localDate(range.from)}
        to={localDate(range.to)}
        lang={lang}
      />

      <ReportsSummary report={report} lang={lang} />
    </div>
  );
}
