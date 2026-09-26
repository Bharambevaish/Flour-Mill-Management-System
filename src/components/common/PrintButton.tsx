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
        "rounded-xl border border-rose-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-rose-900 shadow-xs transition-all hover:bg-rose-50 hover:border-rose-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }
    >
      {label}
    </button>
  );
}
