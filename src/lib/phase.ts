import { daysBetween } from './dates';
export type Phase = 'baseline' | 'within';
export type PhaseState = 'pre' | 'baseline' | 'within' | 'complete';

// Baseline runs 2 weeks with no product, then Within runs 4 weeks on one
// sachet daily: a 6-week protocol end to end, as the design spec defines it.
// Every window, day counter and ledger length derives from these two numbers,
// so a phase length is changed here and nowhere else.
export const BASELINE_DAYS = 14;
export const WITHIN_DAYS = 28;

/** First day index past the end of the within phase. */
const PROTOCOL_DAYS = BASELINE_DAYS + WITHIN_DAYS;

export function getPhase(startDate: string, localDate: string): { state: PhaseState; dayIndex: number } {
  const dayIndex = daysBetween(startDate, localDate);
  let state: PhaseState;
  if (dayIndex < 0) state = 'pre';
  else if (dayIndex < BASELINE_DAYS) state = 'baseline';
  else if (dayIndex < PROTOCOL_DAYS) state = 'within';
  else state = 'complete';
  return { state, dayIndex };
}

/**
 * The 1-based "day N of M" position inside the member's current phase. Within
 * restarts the count at 1, so day 14 of the protocol reads as Within day 1.
 */
export function phaseProgress(state: Phase, dayIndex: number): { day: number; total: number } {
  if (state === 'baseline') return { day: dayIndex + 1, total: BASELINE_DAYS };
  return { day: dayIndex - BASELINE_DAYS + 1, total: WITHIN_DAYS };
}
