export function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string) => {
    // Neutralize spreadsheet formula injection: a cell starting with any of
    // these is executed as a formula by Excel/Sheets. Prefix with a single
    // quote so the value is treated as text.
    let safe = value;
    if (/^[=+\-@\t\r]/.test(safe)) {
      safe = `'${safe}`;
    }
    // Quote when the value contains a delimiter, quote, or line break
    // (including a lone carriage return, which parsers treat as a row break).
    if (/[",\n\r]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, string>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
