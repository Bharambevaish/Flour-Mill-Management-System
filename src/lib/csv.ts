/**
 * Tiny CSV serializer (RFC-4180 style) with a UTF-8 BOM.
 *
 * The BOM matters: without it Excel on Windows mis-decodes Marathi text and the
 * rupee sign. Values containing `,`, `"`, CR or LF are quoted; inner quotes are
 * doubled. Rows are joined with CRLF for maximum spreadsheet compatibility.
 */
export type CsvValue = string | number | null | undefined;

/**
 * Spreadsheet formula-injection guard.
 *
 * A cell beginning with `=`/`+`/`-`/`@` (or a leading tab/CR) is executed as a
 * formula by Excel, LibreOffice and Google Sheets. Customer names, notes and
 * UPI references are attacker-influenced free text, so a name like
 * `=cmd|'/c calc'!A1` would otherwise run when the owner opens the export.
 * Prefixing with an apostrophe forces literal text. Numbers are left alone —
 * they are typed `number`, so a legitimate negative amount still exports as a
 * number.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function neutralizeFormula(value: CsvValue): string {
  // Only *text* is guarded. A genuine number is already typed as a number by the
  // spreadsheet, so `-5` is a negative amount, not a formula — prefixing it with
  // an apostrophe would turn it into text and break the column.
  if (typeof value === "number") return String(value);
  const s = value === null || value === undefined ? "" : String(value);
  return FORMULA_LEAD.test(s) ? `'${s}` : s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const escape = (value: CsvValue): string => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cell = (value: CsvValue): string => escape(neutralizeFormula(value));
  const lines = [
    headers.map(cell).join(","),
    ...rows.map((r) => r.map(cell).join(",")),
  ];
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
