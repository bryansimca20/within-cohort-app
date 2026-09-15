import { dailyCheckins, sessionLogs } from '@/db/schema';

export type CheckinRow = typeof dailyCheckins.$inferSelect;
export type SessionRow = typeof sessionLogs.$inferSelect;
export type Phase = CheckinRow['phase'];

export type DayGroup = {
  localDate: string;
  phase: Phase;
  checkin: CheckinRow | null;
  sessions: SessionRow[];
};

// Pure grouping core: merge a member's check-ins and session logs, keyed by
// local date, into one row per day. A day's phase comes from whichever row
// is present (check-in wins if both exist; they should always agree since
// both are stamped from the same getPhase call on the day they were saved).
// Sorted newest first. Shared by the member-facing History page
// (src/app/(app)/history/page.tsx) and the admin member drilldown
// (src/app/admin/member/[id]/page.tsx), which read different auth contexts
// (requireMember vs requireAdmin) but need identical grouping.
export function groupByDate(checkins: CheckinRow[], sessions: SessionRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const c of checkins) {
    map.set(c.localDate, { localDate: c.localDate, phase: c.phase, checkin: c, sessions: [] });
  }
  for (const s of sessions) {
    const existing = map.get(s.localDate);
    if (existing) {
      existing.sessions.push(s);
    } else {
      map.set(s.localDate, { localDate: s.localDate, phase: s.phase, checkin: null, sessions: [s] });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.localDate < b.localDate ? 1 : a.localDate > b.localDate ? -1 : 0));
}

// 'YYYY-MM-DD' is a plain calendar date with no time component; parsing it
// and re-formatting it must stay pinned to UTC end to end, otherwise a
// negative-offset server timezone can roll the displayed date back a day.
export function formatDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function phaseLabel(phase: Phase): string {
  return phase === 'baseline' ? 'Baseline' : 'On Within';
}

export const SESSION_TYPE_LABELS: Record<SessionRow['sessionType'], string> = {
  easy: 'Easy',
  long: 'Long',
  tempo: 'Tempo',
  interval: 'Interval',
  recovery: 'Recovery',
  race: 'Race',
  other: 'Other',
};

export function sessionTypeLabel(session: SessionRow): string {
  if (session.sessionType === 'other') {
    return session.sessionTypeOther || 'Other';
  }
  return SESSION_TYPE_LABELS[session.sessionType];
}

/** Readout for a session's serving count: '' for a baseline null or a within 0, else '1 serving' / 'N servings'. */
export function servingsLabel(servings: number | null): string {
  if (!servings) return '';
  return servings === 1 ? '1 serving' : `${servings} servings`;
}
