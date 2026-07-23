import { eq, and } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { getPhase, type PhaseState } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

export type DashboardRow = {
  id: string;
  name: string;
  localDate: string;
  checkedInToday: boolean;
  sessionCount: number;
  phaseState: PhaseState;
  dayIndex: number;
};

// Pure, testable core: given a db handle and the "now" instant, resolve the
// founder-facing status row for every member currently in the cohort. Each
// member's "today" is their own local date, computed from their own
// timezone, since cohort members may span zones. Capture-only: this reports
// completion/status (checked in? how many sessions? what phase/day?) and
// never derives analytics like training load or trends. A member who hasn't
// been assigned a cohort start date yet (cohortStartDate === null) is always
// "pre" rather than calling getPhase with a null start.
export async function buildDashboard(db: AnyPgDatabase, now: Date): Promise<DashboardRow[]> {
  const cohortMembers = await db.select().from(members).where(eq(members.inCohort, true));

  const rows: DashboardRow[] = [];
  for (const member of cohortMembers) {
    const localDate = localDateFor(member.timezone, now);

    let phaseState: PhaseState;
    let dayIndex: number;
    if (member.cohortStartDate) {
      ({ state: phaseState, dayIndex } = getPhase(member.cohortStartDate, localDate));
    } else {
      phaseState = 'pre';
      dayIndex = -1;
    }

    const checkinRows = await db
      .select({ id: dailyCheckins.id })
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)));
    const checkedInToday = checkinRows.length > 0;

    const sessionRows = await db
      .select({ id: sessionLogs.id })
      .from(sessionLogs)
      .where(and(eq(sessionLogs.memberId, member.id), eq(sessionLogs.localDate, localDate)));
    const sessionCount = sessionRows.length;

    rows.push({
      id: member.id,
      name: member.name,
      localDate,
      checkedInToday,
      sessionCount,
      phaseState,
      dayIndex,
    });
  }

  return rows;
}
