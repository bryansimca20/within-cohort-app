import { daysBetween } from './dates';
export type Phase = 'baseline' | 'within';
export type PhaseState = 'pre' | 'baseline' | 'within' | 'complete';

export function getPhase(startDate: string, localDate: string): { state: PhaseState; dayIndex: number } {
  const dayIndex = daysBetween(startDate, localDate);
  let state: PhaseState;
  if (dayIndex < 0) state = 'pre';
  else if (dayIndex <= 13) state = 'baseline';
  else if (dayIndex <= 41) state = 'within';
  else state = 'complete';
  return { state, dayIndex };
}
