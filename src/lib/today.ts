import { eq, and } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { dailyCheckins, sessionLogs, type Member } from '@/db/schema';
import type * as schema from '@/db/schema';
import { getPhase, type PhaseState } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE } from '@/lib/cohort';
import { computeStreak } from '@/lib/streak';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

export type TodayStatus = {
  phaseState: PhaseState;
  dayIndex: number;
  localDate: string;
  checkinDone: boolean;
  sessionCount: number;
  streak: number;
  phaseComplete: boolean;
};

// Pure, testable core: given a db handle, the member, the "now" instant, and
// the cohort start date, resolve everything the /today page needs in one
// place: phase window, whether today's check-in exists, how many sessions
// were logged today, and the current check-in streak.
export async function getTodayStatus(db: AnyPgDatabase, member: Member, now: Date, startDate: string): Promise<TodayStatus> {
  const localDate = localDateFor(COHORT_TIMEZONE, now);

  const { state: phaseState, dayIndex } = getPhase(startDate, localDate);

  // Pull every check-in date for this member once: it doubles as the input
  // to computeStreak and tells us whether today specifically is done,
  // without a second round-trip.
  const checkinRows = await db
    .select({ localDate: dailyCheckins.localDate })
    .from(dailyCheckins)
    .where(eq(dailyCheckins.memberId, member.id));
  const checkinDates = checkinRows.map((row) => row.localDate);
  const checkinDone = checkinDates.includes(localDate);

  const sessionRows = await db
    .select({ id: sessionLogs.id })
    .from(sessionLogs)
    .where(and(eq(sessionLogs.memberId, member.id), eq(sessionLogs.localDate, localDate)));
  const sessionCount = sessionRows.length;

  const streak = computeStreak(checkinDates, localDate);

  return {
    phaseState,
    dayIndex,
    localDate,
    checkinDone,
    sessionCount,
    streak,
    phaseComplete: phaseState === 'complete',
  };
}
