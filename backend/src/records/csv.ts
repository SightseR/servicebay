/**
 * RFC 4180 CSV builder. Italian Excel splits on ';' by default and English on ',',
 * so the delimiter follows the export language. A UTF-8 BOM makes Excel read accents correctly.
 */
export type CsvLang = 'en' | 'it';

export const csvDelimiter = (lang: CsvLang) => (lang === 'it' ? ';' : ',');

export function csvCell(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n;]/.test(safe) || safe.includes(delimiter) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][], lang: CsvLang): string {
  const d = csvDelimiter(lang);
  const body = rows.map((r) => r.map((c) => csvCell(c, d)).join(d)).join('\r\n');
  return '\uFEFF' + body + '\r\n';
}
