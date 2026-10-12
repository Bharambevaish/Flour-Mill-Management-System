"use client";

import { IconPrinter } from "./Icons";

/**
 * Triggers the browser print dialog (→ "Save as PDF"). The class `no-print` is
 * stripped from the printout via the global `@media print` rules, so callers
 * should mark surrounding toolbars with `no-print` too.
 */
export function PrintButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "stitch-btn-secondary px-3.5 py-1.5 text-sm"
      }
    >
      <IconPrinter className="h-4 w-4" />
      {label.replace(/^🖨\s*/u, "")}
    </button>
  );
}
