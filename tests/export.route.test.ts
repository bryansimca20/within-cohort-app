import { makeTestDb } from './helpers/testDb';
import { members, dailyCheckins, sessionLogs } from '@/db/schema';
import {
  checkinRowsToCsvRows,
  sessionRowsToCsvRows,
  fetchCheckinExportRows,
  fetchSessionExportRows,
} from '@/app/admin/export/route';
import { toCsv } from '@/lib/csv';

// --- Pure mapper tests: fabricated joined rows, no db needed. ---------------

test('checkinRowsToCsvRows flattens to snake_case columns in the required order', () => {
  const rows = checkinRowsToCsvRows([
    {
      member: 'Ana',
      localDate: '2026-08-01',
      phase: 'baseline',
      recovery: 72,
      restingHr: 48,
      hrvMs: 52,
      sleepMinutes: 450,
      hooperSleep: 3,
      hooperFatigue: 2,
      hooperSoreness: 2,
      hooperStress: 1,
      note: null,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
  ]);

  expect(rows).toHaveLength(1);
  expect(Object.keys(rows[0])).toEqual([
    'member',
    'local_date',
    'phase',
    'recovery',
    'resting_hr',
    'hrv_ms',
    'sleep_hhmm',
    'sleep_minutes',
    'hooper_sleep',
    'hooper_fatigue',
    'hooper_soreness',
    'hooper_stress',
    'note',
    'created_at',
  ]);
  expect(rows[0]).toMatchObject({
    member: 'Ana',
    local_date: '2026-08-01',
    phase: 'baseline',
    recovery: 72,
    resting_hr: 48,
    hrv_ms: 52,
    sleep_hhmm: '7:30',
    sleep_minutes: 450,
    hooper_sleep: 3,
    hooper_fatigue: 2,
    hooper_soreness: 2,
    hooper_stress: 1,
    note: null,
    created_at: '2026-08-01T09:00:00.000Z',
  });
});

test('checkinRowsToCsvRows null note serializes as an empty CSV cell', () => {
  const rows = checkinRowsToCsvRows([
    {
      member: 'Ana',
      localDate: '2026-08-01',
      phase: 'baseline',
      recovery: 72,
      restingHr: 48,
      hrvMs: 52,
      sleepMinutes: 450,
      hooperSleep: 3,
      hooperFatigue: 2,
      hooperSoreness: 2,
      hooperStress: 1,
      note: null,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
  ]);
  const csv = toCsv(rows);
  const header = csv.split('\n')[0].split(',');
  const cells = csv.split('\n')[1].split(',');
  expect(cells[header.indexOf('note')]).toBe('');
  expect(csv.split('\n')[0]).toBe(
    'member,local_date,phase,recovery,resting_hr,hrv_ms,sleep_hhmm,sleep_minutes,hooper_sleep,hooper_fatigue,hooper_soreness,hooper_stress,note,created_at',
  );
});

test('sessionRowsToCsvRows flattens to snake_case columns in the required order', () => {
  const rows = sessionRowsToCsvRows([
    {
      member: 'Ana',
      localDate: '2026-08-01',
      phase: 'baseline',
      sessionType: 'easy',
      sessionTypeOther: null,
      rpe: 5,
      durationMin: 30,
      distanceKm: '12.3',
      tookServing: null,
      note: null,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
    {
      member: 'Ben',
      localDate: '2026-08-15',
      phase: 'within',
      sessionType: 'other',
      sessionTypeOther: 'Fartlek',
      rpe: 7,
      durationMin: 45,
      distanceKm: '8.0',
      tookServing: true,
      note: 'felt strong, cold',
      createdAt: new Date('2026-08-15T09:00:00.000Z'),
    },
  ]);

  expect(Object.keys(rows[0])).toEqual([
    'member',
    'local_date',
    'phase',
    'session_type',
    'session_type_other',
    'rpe',
    'duration_min',
    'distance_km',
    'took_serving',
    'note',
    'created_at',
  ]);
  expect(rows[0].took_serving).toBeNull();
  expect(rows[1].took_serving).toBe(true);
  expect(rows[1].note).toBe('felt strong, cold');
});

test('sessionRowsToCsvRows null took_serving serializes as an empty CSV cell', () => {
  const rows = sessionRowsToCsvRows([
    {
      member: 'Ana',
      localDate: '2026-08-01',
      phase: 'baseline',
      sessionType: 'easy',
      sessionTypeOther: null,
      rpe: 5,
      durationMin: 30,
      distanceKm: '12.3',
      tookServing: null,
      note: null,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
  ]);
  const csv = toCsv(rows);
  const cells = csv.split('\n')[1].split(',');
  // session_type_other, took_serving, note are all empty for this row
  expect(cells[4]).toBe(''); // session_type_other
  expect(cells[8]).toBe(''); // took_serving
  expect(cells[9]).toBe(''); // note
});

// --- Integration: real join + ordering against pglite. ---------------------

test('fetchCheckinExportRows joins member name and orders by member then date', async () => {
  const { db } = await makeTestDb();
  const [ana] = await db
    .insert(members)
    .values({ name: 'Zed', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();
  const [ben] = await db
    .insert(members)
    .values({ name: 'Amy', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();

  await db.insert(dailyCheckins).values([
    { memberId: ana.id, localDate: '2026-08-02', phase: 'baseline', recovery: 70, restingHr: 50, sleepMinutes: 420, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: null },
    { memberId: ana.id, localDate: '2026-08-01', phase: 'baseline', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: 'a note' },
    { memberId: ben.id, localDate: '2026-08-01', phase: 'baseline', recovery: 65, restingHr: 55, sleepMinutes: 390, hooperSleep: 4, hooperFatigue: 3, hooperSoreness: 3, hooperStress: 2, note: null },
  ]);

  const rows = await fetchCheckinExportRows(db);
  expect(rows.map((r) => [r.member, r.localDate])).toEqual([
    ['Amy', '2026-08-01'],
    ['Zed', '2026-08-01'],
    ['Zed', '2026-08-02'],
  ]);

  const csvRows = checkinRowsToCsvRows(rows);
  const csv = toCsv(csvRows);
  expect(csv.split('\n')[0]).toBe(
    'member,local_date,phase,recovery,resting_hr,hrv_ms,sleep_hhmm,sleep_minutes,hooper_sleep,hooper_fatigue,hooper_soreness,hooper_stress,note,created_at',
  );
  expect(csv).toContain('Amy,2026-08-01');
});

test('fetchSessionExportRows joins member name and orders by member then date', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Cal', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();

  await db.insert(sessionLogs).values([
    { memberId: m.id, localDate: '2026-08-01', phase: 'baseline', sessionType: 'easy', rpe: 5, durationMin: 30, distanceKm: '12.3', tookServing: null, note: null },
    { memberId: m.id, localDate: '2026-08-15', phase: 'within', sessionType: 'other', sessionTypeOther: 'Fartlek', rpe: 7, durationMin: 45, distanceKm: '8.0', tookServing: true, note: 'good' },
  ]);

  const rows = await fetchSessionExportRows(db);
  expect(rows).toHaveLength(2);
  expect(rows[0].localDate).toBe('2026-08-01');
  expect(rows[1].localDate).toBe('2026-08-15');

  const csvRows = sessionRowsToCsvRows(rows);
  expect(csvRows[0].took_serving).toBeNull();
  expect(csvRows[1].took_serving).toBe(true);
  expect(csvRows[1].session_type_other).toBe('Fartlek');
});

test('checkinRowsToCsvRows null hrv_ms serializes as an empty CSV cell, never a zero', () => {
  const rows = checkinRowsToCsvRows([
    {
      member: 'Ana',
      localDate: '2026-08-01',
      phase: 'baseline',
      recovery: 72,
      restingHr: 48,
      hrvMs: null,
      sleepMinutes: 450,
      hooperSleep: 3,
      hooperFatigue: 2,
      hooperSoreness: 2,
      hooperStress: 1,
      note: null,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
  ]);
  expect(rows[0].hrv_ms).toBeNull();
  const cells = toCsv(rows).split('\n')[1].split(',');
  expect(cells[5]).toBe('');
});
