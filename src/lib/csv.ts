/**
 * Tiny CSV serializer (RFC-4180 style) with a UTF-8 BOM.
 *
 * The BOM matters: without it Excel on Windows mis-decodes Marathi text and the
 * rupee sign. Values containing `,`, `"`, CR or LF are quoted; inner quotes are
 * doubled. Rows are joined with CRLF for maximum spreadsheet compatibility.
 */
export type CsvValue = string | number | null | undefined;

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const escape = (value: CsvValue): string => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** Trigger a browser download of a CSV string. Client-side only. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
