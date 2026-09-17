// Decimal entry is the one place the app cannot assume a '.' separator. iOS
// renders the numeric keypad from the *device region*, so members in
// comma-decimal locales (Indonesia included) get a ',' key and no '.' key at
// all. A native `<input type="number">` throws that value away silently, so
// distance is a masked text input instead and both halves of the round-trip
// live here: the field masks, the schema parses.
const SEPARATOR = /[.,]/;

/** Formats a partially typed decimal as the member types it: digits plus at most one separator, fraction capped at `maxDecimals`. The separator they typed is kept as-is ('5,2' stays '5,2'), so the field never fights the keypad. */
export function maskDecimal(raw: string, maxDecimals = 2): string {
  const at = raw.search(SEPARATOR);
  if (at === -1) return raw.replace(/\D/g, '');
  const whole = raw.slice(0, at).replace(/\D/g, '');
  const fraction = raw.slice(at + 1).replace(/\D/g, '').slice(0, maxDecimals);
  return `${whole}${raw[at]}${fraction}`;
}

/** Parses a typed decimal ('5.25', '5,25', '.5') into a number, or null when the shape is not a plain non-negative decimal. Range is the schema's job, not this one's. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '' || normalized === '.') return null;
  if (!/^\d*\.?\d*$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Rounds to a fixed number of decimal places, so a value can never exceed the scale of the column it is about to be written to. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Renders a fixed-scale numeric string the way a member reads it: '12.30' -> '12.3', '20.00' -> '20'. Postgres pads numeric(5,2) to its full scale on the way out; nobody logs "20.00 km". */
export function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/\.?0+$/, '');
}
