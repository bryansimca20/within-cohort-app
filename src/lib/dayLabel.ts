/**
 * Day-number and weekday split for a History row. 'YYYY-MM-DD' is a plain
 * calendar date with no time component, so parsing and formatting stay pinned
 * to UTC end to end: a negative-offset server timezone would otherwise render
 * the day before.
 */
export function splitLocalDate(dateISO: string): { dayNum: string; weekday: string } {
  const date = new Date(dateISO);
  return {
    dayNum: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  };
}

/**
 * Compact "Sep 17" label for a header or section heading, where the full
 * weekday-and-year date is too long. Pinned to UTC for the same reason as
 * splitLocalDate: 'YYYY-MM-DD' carries no time, so a negative-offset server
 * timezone would render the day before.
 */
export function shortDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
