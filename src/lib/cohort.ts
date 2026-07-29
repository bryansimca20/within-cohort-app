// Cohort-wide config that is the same for every member. The timezone is a
// constant; the start date is stored in the single `cohort_config` row so a
// founder can set it from the admin area, with the COHORT_START_DATE env var
// as a bootstrap fallback.
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

/** The configured start date if one exists (admin-set value first, then the
 *  COHORT_START_DATE env fallback), or null if neither is set. Never throws —
 *  for the admin settings UI, which must render before a date is chosen. */
export async function getCohortStartDateOrNull(db: AnyPgDatabase): Promise<string | null> {
  const [row] = await db.select({ startDate: cohortConfig.startDate }).from(cohortConfig).limit(1);
  const value = row?.startDate ?? process.env.COHORT_START_DATE ?? null;
  return value && START_DATE_RE.test(value) ? value : null;
}

/** The single cohort start date. The phase calendar is meaningless without it,
 *  so a value set neither in the admin config nor the env is a hard
 *  configuration error rather than something to default around. */
export async function getCohortStartDate(db: AnyPgDatabase): Promise<string> {
  const value = await getCohortStartDateOrNull(db);
  if (!value) {
    throw new Error('Cohort start date is not set. Set it in Admin (or via COHORT_START_DATE).');
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
