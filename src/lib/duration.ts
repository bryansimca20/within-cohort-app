// Sleep is captured as a clock-style duration, so both halves of the
// round-trip live here: the form and the wrapper parse, every reader formats.
// Minutes are the wire format (see daily_checkins.sleep_minutes) because an
// integer count of minutes is exact, where decimal hours are not.
const HH_MM = /^(\d{1,2})(?::(\d{1,2}))?$/;

/** Parses a typed duration ('6:07', '06:07', '6:7', or a bare '7' hours) into whole minutes, or null when the shape is not a duration. Range is checkinSchema's job, not this one's. */
export function parseHhMm(raw: string): number | null {
  const match = HH_MM.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  if (minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Renders whole minutes as 'h:mm' (367 -> '6:07'): minute always padded, hour never, matching how a member types it. */
export function formatHhMm(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Formats a partially typed entry as the member types it, anchoring minutes to the last two digits ('607' -> '6:07'). Non-digits are dropped, so an iOS numeric keypad with no colon key still produces a duration. */
export function maskHhMm(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
}
