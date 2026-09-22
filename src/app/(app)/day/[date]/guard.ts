import { notFound, redirect } from 'next/navigation';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { assertLoggableDate } from '@/lib/logDate';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import type { Member } from '@/db/schema';
import type { Phase } from '@/lib/history';

export type DayScreen =
  | { closed: 'no-start' | 'pre' | 'complete' }
  | { closed: null; member: Member; localDate: string; phase: Phase; startDate: string };

/**
 * The preamble every `/day/[date]` screen shares: session, cohort window, and
 * the date itself. Validation runs through `assertLoggableDate`, the same guard
 * the write cores use, so a screen can never offer a day a write would refuse.
 * Today redirects to its own capture screen (`todayPath`): the today screens own
 * today, these own every earlier day. A malformed, future, or out-of-window date
 * is not a page. A closed window is returned rather than thrown so each screen
 * can word its own notice.
 */
export async function loadDayScreen(date: string, todayPath = '/checkin'): Promise<DayScreen> {
  const member = await requireMember();

  const startDate = await getCohortStartDateOrNull(db);
  if (!startDate) return { closed: 'no-start' };

  const today = localDateFor(COHORT_TIMEZONE, new Date());
  const todayState = getPhase(startDate, today).state;
  if (todayState === 'pre' || todayState === 'complete') return { closed: todayState };

  let day: { localDate: string; phase: Phase } | null = null;
  try {
    day = assertLoggableDate(date, new Date(), startDate, 'check-ins');
  } catch {
    day = null;
  }
  // notFound() throws, so it is called outside the catch that would swallow it.
  if (!day) notFound();

  if (day.localDate === today) redirect(todayPath);

  return { closed: null, member, localDate: day.localDate, phase: day.phase, startDate };
}
