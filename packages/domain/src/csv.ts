/**
 * Minimal RFC 4180-ish CSV encoding: quotes a field only when needed and
 * doubles embedded quotes. No external dependency for something this small
 * and easy to get subtly wrong by hand at each call site.
 */
export function toCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(values: unknown[]): string {
  return values.map(toCsvField).join(",");
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join("\r\n") + "\r\n";
}
