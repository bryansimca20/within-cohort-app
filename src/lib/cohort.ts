// Cohort-wide config that is the same for every member. The timezone is a
// constant; the start date lives in the single `cohort_config` row and is set
// by a founder in the admin area. There is no environment fallback: an unset
// start date is a real "cohort not opened yet" state the UI handles.
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { cohortConfig } from '@/db/schema';
import type * as schema from '@/db/schema';

// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape, so the cores below accept
// either the prod client or the pglite test db.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

// Every member runs on Jakarta time. This is a constant (not per-member), so
// callers pass it into localDateFor instead of reading it off a member row.
export const COHORT_TIMEZONE = 'Asia/Jakarta';

const START_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The founder-set cohort start date, or null when it has not been set yet.
 *  Never throws — pages call this and render a "not opened yet" state when it
 *  is null instead of computing a phase from a missing date. */
export async function getCohortStartDateOrNull(db: AnyPgDatabase): Promise<string | null> {
  const [row] = await db.select({ startDate: cohortConfig.startDate }).from(cohortConfig).limit(1);
  const value = row?.startDate ?? null;
  return value && START_DATE_RE.test(value) ? value : null;
}

/** The cohort start date, asserting one is set. Use only where a valid date is
 *  guaranteed (server actions reached from a page that already gated on it, the
 *  reminder cron after its own null check); pages use getCohortStartDateOrNull. */
export async function getCohortStartDate(db: AnyPgDatabase): Promise<string> {
  const value = await getCohortStartDateOrNull(db);
  if (!value) {
    throw new Error('Cohort start date is not set. A founder must set it in Admin.');
  }
  return value;
}

/** Pure, testable core: upsert the singleton config row with a new start date.
 *  Rejects anything that is not a plain YYYY-MM-DD calendar date. */
export async function setCohortStartDate(db: AnyPgDatabase, startDate: string): Promise<void> {
  if (!START_DATE_RE.test(startDate)) {
    throw new Error('Cohort start date must be a YYYY-MM-DD date');
  }
  await db
    .insert(cohortConfig)
    .values({ id: 1, startDate })
    .onConflictDoUpdate({ target: cohortConfig.id, set: { startDate, updatedAt: new Date() } });
}
