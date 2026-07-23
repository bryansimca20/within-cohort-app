/**
 * Escapes a value per RFC-4180 CSV rules.
 * If the value contains comma, double quote, newline, or carriage return,
 * wrap it in double quotes and double any internal double quotes.
 */
function escapeField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);

  // Check if escaping is needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Double any internal quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of objects to a CSV string.
 * The first row's keys form the header line; each row is serialized in key order.
 * RFC-4180 escaping is applied to all fields.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }

  // Get keys from the first row (header)
  const keys = Object.keys(rows[0]);

  // Build header line
  const header = keys.map(escapeField).join(',');

  // Build data lines
  const lines = rows.map((row) => keys.map((key) => escapeField(row[key])).join(','));

  // Combine header and all lines
  return [header, ...lines].join('\n');
}
