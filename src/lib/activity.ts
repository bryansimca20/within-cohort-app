import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { buildLedger, groupByDate, type CheckinRow, type LedgerDay, type SessionRow } from '@/lib/history';
import { daysBetween, localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE } from '@/lib/cohort';

// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape, so the core below accepts
// either the prod client or the pglite test db.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

// Servings are recorded per session, so a day's total exists only where a
// Within session was logged: null means "no record", not "took none".
export type ActivityDay = LedgerDay & { servings: number | null };

export type MemberActivity = {
  id: string;
  name: string;
  /** Every elapsed protocol day, oldest first, gaps included. */
  days: ActivityDay[];
  checkinCount: number;
  lastCheckinDate: string | null;
  /** Days since the last check-in, or every elapsed day when there is none. */
  daysQuiet: number;
  checkedInToday: boolean;
};

/** A member this many days without a check-in is flagged for a direct message. */
export const QUIET_DAYS = 2;

function daySummary(day: LedgerDay): ActivityDay {
  const answered = day.sessions.filter((s) => s.servings !== null);
  return {
    ...day,
    servings: answered.length === 0 ? null : answered.reduce((sum, s) => sum + (s.servings ?? 0), 0),
  };
}

function byMember<T extends { memberId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.memberId);
    if (list) list.push(row);
    else map.set(row.memberId, [row]);
  }
  return map;
}

/**
 * Pure, testable core: the whole cohort's logging record across the protocol,
 * one row per member currently in the cohort, quietest first. Capture-only: it
 * reports what was logged on which day and never derives a metric from the
 * values logged. Three queries regardless of cohort size.
 */
export async function buildActivity(db: AnyPgDatabase, now: Date, startDate: string): Promise<MemberActivity[]> {
  const cohortMembers = await db.select().from(members).where(eq(members.inCohort, true));
  const checkins: CheckinRow[] = await db.select().from(dailyCheckins);
  const sessions: SessionRow[] = await db.select().from(sessionLogs);
  const checkinsBy = byMember(checkins);
  const sessionsBy = byMember(sessions);
  const today = localDateFor(COHORT_TIMEZONE, now);

  const rows = cohortMembers.map((member): MemberActivity => {
    const groups = groupByDate(checkinsBy.get(member.id) ?? [], sessionsBy.get(member.id) ?? []);
    const days = buildLedger(startDate, today, groups).reverse().map(daySummary);
    const checkedIn = days.filter((d) => d.checkin !== null);
    const lastCheckinDate = checkedIn.at(-1)?.localDate ?? null;
    // Measured against the last day on the ledger, not the clock, so a finished
    // protocol stops counting up.
    const lastDay = days.at(-1)?.localDate ?? null;

    return {
      id: member.id,
      name: member.name,
      days,
      checkinCount: checkedIn.length,
      lastCheckinDate,
      daysQuiet: lastDay === null ? 0 : lastCheckinDate === null ? days.length : daysBetween(lastCheckinDate, lastDay),
      checkedInToday: lastCheckinDate === today,
    };
  });

  return rows.sort((a, b) => b.daysQuiet - a.daysQuiet || a.name.localeCompare(b.name));
}
