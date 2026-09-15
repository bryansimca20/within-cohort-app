import { eq } from 'drizzle-orm';
import { formatHhMm } from '@/lib/duration';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { db as prodDb } from '@/db/client';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { toCsv } from '@/lib/csv';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into these functions.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

type ExportType = 'checkins' | 'sessions';

function parseExportType(value: string | null): ExportType {
  return value === 'sessions' ? 'sessions' : 'checkins';
}

// --- checkins ----------------------------------------------------------

// Shape returned by fetchCheckinExportRows: the joined check-in + member
// columns needed for the export, already flat (member name pulled in
// alongside the check-in's own columns via an explicit select, so there's no
// nested per-table keying to unpack).
type CheckinExportRow = {
  member: string;
  localDate: string;
  phase: string;
  recovery: number;
  restingHr: number;
  hrvMs: number | null;
  sleepMinutes: number;
  hooperSleep: number;
  hooperFatigue: number;
  hooperSoreness: number;
  hooperStress: number;
  note: string | null;
  createdAt: Date;
};

// Pure, testable core: given a db handle, fetch every check-in joined with
// its member's name, ordered by member name then local date for stable,
// readable output. No auth here; that lives in requireAdmin() inside GET
// below, which is what keeps this exercisable against the pglite test
// harness without a session/redirect to fake.
export async function fetchCheckinExportRows(db: AnyPgDatabase): Promise<CheckinExportRow[]> {
  return db
    .select({
      member: members.name,
      localDate: dailyCheckins.localDate,
      phase: dailyCheckins.phase,
      recovery: dailyCheckins.recovery,
      restingHr: dailyCheckins.restingHr,
      hrvMs: dailyCheckins.hrvMs,
      sleepMinutes: dailyCheckins.sleepMinutes,
      hooperSleep: dailyCheckins.hooperSleep,
      hooperFatigue: dailyCheckins.hooperFatigue,
      hooperSoreness: dailyCheckins.hooperSoreness,
      hooperStress: dailyCheckins.hooperStress,
      note: dailyCheckins.note,
      createdAt: dailyCheckins.createdAt,
    })
    .from(dailyCheckins)
    .innerJoin(members, eq(dailyCheckins.memberId, members.id))
    .orderBy(members.name, dailyCheckins.localDate);
}

// Pure row-flattening: joined check-in rows -> flat snake_case CSV rows, in
// the fixed column order the phase-2 analysis handoff expects. Kept separate
// from the db query so it's trivial to unit-test with fabricated rows, no
// pglite/db needed. Capture-only: every column here is raw logged data, no
// derived/computed values.
export function checkinRowsToCsvRows(rows: CheckinExportRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    member: r.member,
    local_date: r.localDate,
    phase: r.phase,
    recovery: r.recovery,
    resting_hr: r.restingHr,
    hrv_ms: r.hrvMs,
    // Both spellings on purpose: sleep_hhmm is how a member entered it and
    // how a founder reads it, sleep_minutes is what a spreadsheet can do
    // arithmetic on without parsing a clock string.
    sleep_hhmm: formatHhMm(r.sleepMinutes),
    sleep_minutes: r.sleepMinutes,
    hooper_sleep: r.hooperSleep,
    hooper_fatigue: r.hooperFatigue,
    hooper_soreness: r.hooperSoreness,
    hooper_stress: r.hooperStress,
    note: r.note,
    created_at: toIso(r.createdAt),
  }));
}

// --- sessions ------------------------------------------------------------

type SessionExportRow = {
  member: string;
  localDate: string;
  phase: string;
  sessionType: string;
  sessionTypeOther: string | null;
  rpe: number;
  durationMin: number;
  distanceKm: string;
  servings: number | null;
  note: string | null;
  createdAt: Date;
};

export async function fetchSessionExportRows(db: AnyPgDatabase): Promise<SessionExportRow[]> {
  return db
    .select({
      member: members.name,
      localDate: sessionLogs.localDate,
      phase: sessionLogs.phase,
      sessionType: sessionLogs.sessionType,
      sessionTypeOther: sessionLogs.sessionTypeOther,
      rpe: sessionLogs.rpe,
      durationMin: sessionLogs.durationMin,
      distanceKm: sessionLogs.distanceKm,
      servings: sessionLogs.servings,
      note: sessionLogs.note,
      createdAt: sessionLogs.createdAt,
    })
    .from(sessionLogs)
    .innerJoin(members, eq(sessionLogs.memberId, members.id))
    .orderBy(members.name, sessionLogs.localDate);
}

export function sessionRowsToCsvRows(rows: SessionExportRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    member: r.member,
    local_date: r.localDate,
    phase: r.phase,
    session_type: r.sessionType,
    session_type_other: r.sessionTypeOther,
    rpe: r.rpe,
    duration_min: r.durationMin,
    distance_km: r.distanceKm,
    servings: r.servings,
    note: r.note,
    created_at: toIso(r.createdAt),
  }));
}

// createdAt is typed Date (per the drizzle timestamp column), but the pglite
// driver used in tests hands back an already-ISO string at runtime; only
// call .toISOString() when we actually got a Date so both drivers normalize
// to the same string.
function toIso(value: Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

// --- route -----------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  await requireAdmin();

  const url = new URL(request.url);
  const type = parseExportType(url.searchParams.get('type'));

  const csv =
    type === 'sessions'
      ? toCsv(sessionRowsToCsvRows(await fetchSessionExportRows(prodDb)))
      : toCsv(checkinRowsToCsvRows(await fetchCheckinExportRows(prodDb)));

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="within-${type}.csv"`,
    },
  });
}
