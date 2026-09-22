/**
 * Minimal RFC 4180 CSV reader — quoted fields, escaped quotes ("") and
 * newlines inside quotes. Enough for spreadsheets exported from Excel, Google
 * Sheets or a case-management system, without pulling in a dependency.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Lower-cased, punctuation-free header key: "Date of Birth" → "dateofbirth". */
export const headerKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Accepts the UK formats people actually type (31/12/1990, 31-12-1990) as well
 * as ISO (1990-12-31). Returns null for anything it can't read confidently.
 */
export function parseUkDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  let year: number;
  let month: number;
  let day: number;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const uk = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (uk) {
    day = Number(uk[1]);
    month = Number(uk[2]);
    year = Number(uk[3]);
    if (year < 100) year += year > new Date().getFullYear() % 100 ? 1900 : 2000;
  } else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || date.getTime() > Date.now()) return null;
  return date;
}
