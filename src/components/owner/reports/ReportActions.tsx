"use client";

import { PrintButton } from "@/components/common";
import type { Lang } from "@/lib/i18n/i18n";

const LINKS = [
  { section: "receipts", mr: "पावती नोंदी", en: "Receipts" },
  { section: "grain", mr: "धान्य अहवाल", en: "Grain" },
  { section: "customers", mr: "ग्राहक उधारी", en: "Customers" },
  { section: "summary", mr: "सारांश", en: "Summary" },
] as const;

/** CSV download links (one per report section) + print-to-PDF for the page. */
export function ReportActions({ query, lang }: { query: string; lang: Lang }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {LINKS.map((l) => (
        <a
          key={l.section}
          href={`/api/owner/reports/export?${query}&section=${l.section}`}
          download
          className="stitch-btn-secondary text-xs sm:text-sm"
        >
          {lang === "mr" ? l.mr : l.en} CSV
        </a>
      ))}
      <PrintButton label={lang === "mr" ? "प्रिंट / PDF" : "Print / PDF"} />
    </div>
  );
}
