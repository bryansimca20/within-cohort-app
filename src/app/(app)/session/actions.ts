'use server';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { sessionLogs, type Member } from '@/db/schema';
import type * as schema from '@/db/schema';
import { sessionSchema } from '@/lib/validation';
import { parseDecimal } from '@/lib/decimal';
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
    // numeric(5,2) is string-mode in drizzle. toFixed(2) rather than
    // toString() so the written string always carries the column's scale
    // (12.3 -> '12.30'), which is exactly what a read gives back.
    distanceKm: parsed.distanceKm.toFixed(2),
    // The serving intervention only exists in the "within" phase: baseline
    // sessions must never record a serving count, regardless of what the
    // form sent. A within 0 is a real answer and is kept.
    servings: state === 'baseline' ? null : (parsed.servings ?? null),
    note: parsed.note ?? null,
  });
}

// Pure, testable core: correct an existing session's metrics in place. The
// row's localDate and stamped phase are immutable (editing fixes data, it
// never re-homes a row to another day/phase), so this writes only the metric
// columns. servings follows the row's STORED phase, not today's: a baseline
// session can never record a serving even when edited during the within phase.
// Rejects a row not owned by `member` and any edit once the protocol is
// complete; the ownership + window guards live here (not just the UI) because
// the wrapper is reachable by direct POST.
export async function updateSession(
  db: AnyPgDatabase,
  member: Member,
  sessionId: string,
  input: unknown,
  now: Date,
  startDate: string,
): Promise<{ localDate: string }> {
  const parsed = sessionSchema.parse(input);

  const { state } = getPhase(startDate, localDateFor(COHORT_TIMEZONE, now));
  if (state === 'pre') throw new Error('Cohort has not started yet');
  if (state === 'complete') throw new Error('Protocol complete: sessions are closed');

  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, sessionId));
  if (!row || row.memberId !== member.id) throw new Error('Session not found');

  await db
    .update(sessionLogs)
    .set({
      sessionType: parsed.sessionType,
      sessionTypeOther: parsed.sessionTypeOther ?? null,
      rpe: parsed.rpe,
      durationMin: parsed.durationMin,
      distanceKm: parsed.distanceKm.toFixed(2),
      servings: row.phase === 'baseline' ? null : (parsed.servings ?? null),
      note: parsed.note ?? null,
    })
    .where(and(eq(sessionLogs.id, sessionId), eq(sessionLogs.memberId, member.id)));

  return { localDate: row.localDate };
}

// Pure, testable core: hard-delete one of a member's own sessions. Same
// ownership + window guards as updateSession. Used to remove a mis-logged or
// double-logged session; there is no soft-delete or audit trail in v1.
export async function deleteSession(
  db: AnyPgDatabase,
  member: Member,
  sessionId: string,
  now: Date,
  startDate: string,
): Promise<void> {
  const { state } = getPhase(startDate, localDateFor(COHORT_TIMEZONE, now));
  if (state === 'pre') throw new Error('Cohort has not started yet');
  if (state === 'complete') throw new Error('Protocol complete: sessions are closed');

  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, sessionId));
  if (!row || row.memberId !== member.id) throw new Error('Session not found');

  await db.delete(sessionLogs).where(and(eq(sessionLogs.id, sessionId), eq(sessionLogs.memberId, member.id)));
}

// FormData gives null when the servings field is absent (the baseline form
// never renders it, or a direct POST) and '' when blank. z.coerce.number()
// would turn both into a real 0 servings, so normalise to undefined and let
// the core store null for "not answered".
function servingsFromForm(formData: FormData): FormDataEntryValue | undefined {
  const raw = formData.get('servings');
  return raw !== null && String(raw).trim() !== '' ? raw : undefined;
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

  // Distance is the one free-typed decimal, and the field accepts either
  // separator, so a comma keypad can leave a bare ',' behind. That clears
  // `required` and the truthiness guard above but is not a number, and
  // sessionSchema would throw out of the action into an error page. Catch it
  // here and send back a message the member can act on instead.
  if (parseDecimal(String(distanceKmRaw)) === null) {
    redirect('/session?error=distance');
  }

  const input = {
    sessionType: sessionTypeRaw,
    sessionTypeOther: formData.get('sessionTypeOther') ?? undefined,
    rpe: rpeRaw,
    durationMin: durationMinRaw,
    distanceKm: distanceKmRaw,
    servings: servingsFromForm(formData),
    note: formData.get('note') ?? undefined,
  };
  await saveSession(prodDb, member, input, new Date(), await getCohortStartDate(prodDb));
  revalidatePath('/today');
  redirect('/today?saved=session');
}

/** Server-action wrapper: edit one of the caller's own sessions from the edit route, then revalidate and redirect back to where the edit began. */
export async function updateSessionAction(sessionId: string, formData: FormData): Promise<void> {
  const member = await requireMember();
  const from = String(formData.get('from') ?? 'history');

  const sessionTypeRaw = formData.get('sessionType');
  const rpeRaw = formData.get('rpe');
  const durationMinRaw = formData.get('durationMin');
  const distanceKmRaw = formData.get('distanceKm');

  // Same coercion guard as saveSessionAction: reject incomplete submissions
  // before z.coerce turns missing fields into valid-looking zeros.
  if (!sessionTypeRaw || !rpeRaw || !durationMinRaw || !distanceKmRaw) {
    redirect(`/session/${sessionId}/edit?error=missing&from=${from}`);
  }
  if (parseDecimal(String(distanceKmRaw)) === null) {
    redirect(`/session/${sessionId}/edit?error=distance&from=${from}`);
  }

  const input = {
    sessionType: sessionTypeRaw,
    sessionTypeOther: formData.get('sessionTypeOther') ?? undefined,
    rpe: rpeRaw,
    durationMin: durationMinRaw,
    distanceKm: distanceKmRaw,
    servings: servingsFromForm(formData),
    note: formData.get('note') ?? undefined,
  };

  await updateSession(prodDb, member, sessionId, input, new Date(), await getCohortStartDate(prodDb));
  revalidatePath('/today');
  revalidatePath('/history');
  revalidatePath('/session');

  redirect(`${from === 'session' ? '/session' : '/history'}?saved=session`);
}

/** Server-action wrapper: hard-delete one of the caller's own sessions (invoked inline from the Session/History lists), then revalidate. */
export async function deleteSessionAction(sessionId: string): Promise<void> {
  const member = await requireMember();
  await deleteSession(prodDb, member, sessionId, new Date(), await getCohortStartDate(prodDb));
  revalidatePath('/today');
  revalidatePath('/history');
  revalidatePath('/session');
}
