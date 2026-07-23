import { eq, and } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { dailyCheckins, members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

export type ReminderMember = {
  id: string;
  name: string;
  timezone: string;
};

// Pure, testable core: resolve which in-cohort members are due a "morning
// check-in ready" reminder right now. A member is due when their local
// today falls in an active phase (baseline or within - not pre-start and
// not the post-protocol read-only window) and they have not yet logged a
// check-in for that local date. A member with no cohortStartDate is always
// "pre" and is never due. Capture-only: this only decides who to remind, it
// derives no analytics from the logs.
export async function membersNeedingReminder(db: AnyPgDatabase, now: Date): Promise<ReminderMember[]> {
  const cohortMembers = await db.select().from(members).where(eq(members.inCohort, true));

  const due: ReminderMember[] = [];
  for (const member of cohortMembers) {
    if (!member.cohortStartDate) continue;

    const localDate = localDateFor(member.timezone, now);
    const { state } = getPhase(member.cohortStartDate, localDate);
    if (state !== 'baseline' && state !== 'within') continue;

    const checkinRows = await db
      .select({ id: dailyCheckins.id })
      .from(dailyCheckins)
      .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)));
    if (checkinRows.length > 0) continue;

    due.push({ id: member.id, name: member.name, timezone: member.timezone });
  }

  return due;
}
