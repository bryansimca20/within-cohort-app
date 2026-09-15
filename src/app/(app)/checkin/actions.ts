'use server';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { dailyCheckins, type Member } from '@/db/schema';
import type * as schema from '@/db/schema';
import { checkinSchema } from '@/lib/validation';
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

// Pure, testable core: given a db handle, the member checking in, raw form
// input, and the "now" instant, validate + phase-stamp + upsert a check-in
// row. No cookies, no redirects; those live in the `saveCheckinAction` server
// action below so this stays trivial to exercise against the pglite test
// harness.
export async function saveCheckin(db: AnyPgDatabase, member: Member, input: unknown, now: Date, startDate: string): Promise<void> {
  const parsed = checkinSchema.parse(input);
  const localDate = localDateFor(COHORT_TIMEZONE, now);

  const { state } = getPhase(startDate, localDate);
  if (state === 'pre') {
    throw new Error('Cohort has not started yet');
  }
  if (state === 'complete') {
    throw new Error('Protocol complete: check-ins are closed');
  }

  const values = {
    memberId: member.id,
    localDate,
    phase: state,
    recovery: parsed.recovery,
    restingHr: parsed.restingHr,
    // Explicit null, not undefined: this same object is the upsert's
    // update set, so clearing the field on a same-day edit has to write
    // the null back rather than leave the morning's reading stranded.
    hrvMs: parsed.hrvMs ?? null,
    // numeric(3,1) columns are string-mode in drizzle: convert so the value
    // round-trips (parsed.sleepHours is a coerced number, e.g. 7.5).
    sleepHours: parsed.sleepHours.toString(),
    hooperSleep: parsed.hooperSleep,
    hooperFatigue: parsed.hooperFatigue,
    hooperSoreness: parsed.hooperSoreness,
    hooperStress: parsed.hooperStress,
    note: parsed.note ?? null,
    updatedAt: now,
  };

  await db
    .insert(dailyCheckins)
    .values(values)
    .onConflictDoUpdate({
      target: [dailyCheckins.memberId, dailyCheckins.localDate],
      set: values,
    });
}

export async function saveCheckinAction(formData: FormData): Promise<void> {
  const member = await requireMember();

  const recoveryRaw = formData.get('recovery');
  const restingHrRaw = formData.get('restingHr');
  const sleepHoursRaw = formData.get('sleepHours');
  const hooperSleepRaw = formData.get('hooperSleep');
  const hooperFatigueRaw = formData.get('hooperFatigue');
  const hooperSorenessRaw = formData.get('hooperSoreness');
  const hooperStressRaw = formData.get('hooperStress');

  // z.coerce.number() turns a missing field into 0 (Number(null) === 0) and
  // an empty string into 0 as well (Number('') === 0), so an incomplete
  // submission would otherwise coerce into valid-looking zeros instead of
  // failing. Reject those up front rather than letting them coerce.
  if (
    !recoveryRaw ||
    !restingHrRaw ||
    !sleepHoursRaw ||
    !hooperSleepRaw ||
    !hooperFatigueRaw ||
    !hooperSorenessRaw ||
    !hooperStressRaw
  ) {
    redirect('/checkin?error=1');
  }

  // HRV is the one optional watch field. FormData gives null when the input is
  // absent and '' when it is present but empty, and z.coerce.number() turns
  // both into 0, so normalise to undefined and let the schema's .optional()
  // handle it. Without this a member who skips HRV would silently log 0 ms.
  const hrvMsRaw = formData.get('hrvMs');
  const hrvMs = hrvMsRaw !== null && String(hrvMsRaw).trim() !== '' ? hrvMsRaw : undefined;

  const input = {
    recovery: recoveryRaw,
    restingHr: restingHrRaw,
    hrvMs,
    sleepHours: sleepHoursRaw,
    hooperSleep: hooperSleepRaw,
    hooperFatigue: hooperFatigueRaw,
    hooperSoreness: hooperSorenessRaw,
    hooperStress: hooperStressRaw,
    note: formData.get('note') ?? undefined,
  };
  await saveCheckin(prodDb, member, input, new Date(), await getCohortStartDate(prodDb));
  revalidatePath('/today');
  redirect('/today?saved=checkin');
}
