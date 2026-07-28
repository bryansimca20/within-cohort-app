'use server';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { sessionLogs, type Member } from '@/db/schema';
import type * as schema from '@/db/schema';
import { sessionSchema } from '@/lib/validation';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDate } from '@/lib/cohort';
import { requireMember } from '@/lib/session';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

// Pure, testable core: given a db handle, the member logging a session, raw
// form input, and the "now" instant, validate + phase-stamp + insert a new
// session_logs row. Unlike check-ins, multiple sessions per member per day
// are allowed (no unique constraint), so this always inserts and never
// upserts. No cookies, no redirects; those live in `saveSessionAction` below
// so this stays trivial to exercise against the pglite test harness.
export async function saveSession(db: AnyPgDatabase, member: Member, input: unknown, now: Date, startDate: string): Promise<void> {
  const parsed = sessionSchema.parse(input);
  const localDate = localDateFor(COHORT_TIMEZONE, now);

  const { state } = getPhase(startDate, localDate);
  if (state === 'pre') {
    throw new Error('Cohort has not started yet');
  }
  if (state === 'complete') {
    throw new Error('Protocol complete: sessions are closed');
  }

  await db.insert(sessionLogs).values({
    memberId: member.id,
    localDate,
    phase: state,
    sessionType: parsed.sessionType,
    sessionTypeOther: parsed.sessionTypeOther ?? null,
    rpe: parsed.rpe,
    durationMin: parsed.durationMin,
    // numeric(4,1) is string-mode in drizzle: convert so the value
    // round-trips (parsed.distanceKm is a coerced number, e.g. 12.3).
    distanceKm: parsed.distanceKm.toString(),
    // The serving intervention only exists in the "within" phase: baseline
    // sessions must never record a serving answer, regardless of what the
    // form sent.
    tookServing: state === 'baseline' ? null : (parsed.tookServing ?? null),
    note: parsed.note ?? null,
  });
}

export async function saveSessionAction(formData: FormData): Promise<void> {
  const member = await requireMember();

  const sessionTypeRaw = formData.get('sessionType');
  const rpeRaw = formData.get('rpe');
  const durationMinRaw = formData.get('durationMin');
  const distanceKmRaw = formData.get('distanceKm');

  // z.coerce.number() turns a missing field into 0 (Number(null) === 0) and
  // an empty string into 0 as well (Number('') === 0), so an incomplete
  // submission would otherwise coerce into valid-looking zeros instead of
  // failing. Reject those up front rather than letting them coerce.
  if (!sessionTypeRaw || !rpeRaw || !durationMinRaw || !distanceKmRaw) {
    redirect('/session?error=missing');
  }

  // Checkbox inputs post 'on' (default) or an explicit 'true'/'false' value
  // when checked/unchecked; absence means "not answered" rather than false.
  const tookServingRaw = formData.get('tookServing');
  const input = {
    sessionType: sessionTypeRaw,
    sessionTypeOther: formData.get('sessionTypeOther') ?? undefined,
    rpe: rpeRaw,
    durationMin: durationMinRaw,
    distanceKm: distanceKmRaw,
    tookServing: tookServingRaw === null ? undefined : tookServingRaw === 'true' || tookServingRaw === 'on',
    note: formData.get('note') ?? undefined,
  };
  await saveSession(prodDb, member, input, new Date(), getCohortStartDate());
  revalidatePath('/today');
  redirect('/today');
}
