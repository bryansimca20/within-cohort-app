import { isValid, parseISO } from 'date-fns';
import { getPhase, type Phase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE } from '@/lib/cohort';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates the day a member is writing to and resolves the phase to stamp on
 * it. Shared by the check-in and session cores so backfill obeys one set of
 * rules: a real calendar date, never in the future, inside the protocol window,
 * and nothing at all once the protocol completes. The phase comes from the
 * target day, never from today, which is what keeps a baseline morning filled
 * in during the within phase out of the within data.
 *
 * Lives in the core rather than the page because every server action is
 * reachable by direct POST.
 */
export function assertLoggableDate(
  targetDate: string,
  now: Date,
  startDate: string,
  what: 'check-ins' | 'sessions',
): { localDate: string; phase: Phase } {
  if (!DATE_RE.test(targetDate) || !isValid(parseISO(targetDate))) {
    throw new Error('Date to log must be a YYYY-MM-DD calendar date');
  }

  const today = localDateFor(COHORT_TIMEZONE, now);

  // Checked before anything about the target day: when the window closes,
  // every write closes with it and unfilled gaps stay gaps.
  if (getPhase(startDate, today).state === 'complete') {
    throw new Error(`Protocol complete: ${what} are closed`);
  }
  if (targetDate > today) {
    throw new Error('Cannot log a day that has not happened yet');
  }

  const { state } = getPhase(startDate, targetDate);
  if (state === 'pre') {
    throw new Error('Cohort has not started yet');
  }
  if (state === 'complete') {
    throw new Error(`Protocol complete: ${what} are closed`);
  }

  return { localDate: targetDate, phase: state };
}
