import { formatInTimeZone } from 'date-fns-tz';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function localDateFor(timezone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, timezone, 'yyyy-MM-dd');
}
export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO));
}

/** Returns true iff `tz` is a valid IANA timezone name Intl can resolve. */
export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
