import "server-only";
import { NextResponse } from "next/server";

/**
 * Quotes a field only when it needs it (contains a comma, quote, or line
 * break), doubling any internal quotes — the standard CSV escaping rule.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(columns: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [columns.map(escapeCsvField).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsvField).join(","));
  // A leading UTF-8 BOM is what makes Excel (rather than just any text editor)
  // recognise this as UTF-8 instead of guessing a legacy codepage — without it,
  // names or emails with accented characters render as mojibake in Excel.
  return "\uFEFF" + lines.join("\r\n");
}

/** Builds a downloadable CSV response — opens directly in Excel, Numbers, or Sheets. */
export function csvResponse(filename: string, columns: string[], rows: (string | number | null | undefined)[][]) {
  return new NextResponse(toCsv(columns, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
