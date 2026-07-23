import { daysBetween } from './dates';

// Pure function: given the set of local dates ('YYYY-MM-DD') a member has
// checked in on and "today" (also a local date string), return the length
// of the current unbroken streak of consecutive-day check-ins.
//
// The streak anchors on today if a check-in exists for today; otherwise it
// anchors on yesterday (so a member who hasn't checked in yet today doesn't
// see their streak drop to 0 mid-day). If neither today nor yesterday has a
// check-in, the streak is 0. From the anchor, walk backward through the
// sorted dates counting consecutive calendar days until a gap is found.
export function computeStreak(checkinDates: string[], todayISO: string): number {
  const sorted = Array.from(new Set(checkinDates)).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  if (sorted.length === 0) return 0;

  const mostRecent = sorted[0];
  const isToday = mostRecent === todayISO;
  const isYesterday = daysBetween(mostRecent, todayISO) === 1;
  if (!isToday && !isYesterday) return 0;

  let count = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (daysBetween(sorted[i + 1], sorted[i]) === 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
