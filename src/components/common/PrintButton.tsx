"use client";

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
        "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </button>
  );
}
