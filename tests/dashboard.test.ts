import { makeTestDb } from './helpers/testDb';
import { members, sessionLogs } from '@/db/schema';
import { buildDashboard } from '@/lib/dashboard';
import { saveCheckin } from '@/app/(app)/checkin/actions';

const START = '2026-08-01';
const valid = { recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 };

test('flags who is missing today', async () => {
  const { db } = await makeTestDb();
  const [a] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();
  await db
    .insert(members)
    .values({ name: 'Bo', passcodeHash: 'x', inCohort: true, isAdmin: false });
  await saveCheckin(db, a, valid, new Date('2026-08-01T02:00:00Z'), START);
  const d = await buildDashboard(db, new Date('2026-08-01T02:00:00Z'), START);
  expect(d.find((r) => r.name === 'Ana')!.checkedInToday).toBe(true);
  expect(d.find((r) => r.name === 'Bo')!.checkedInToday).toBe(false);
});

test('excludes members not currently in cohort', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Cas', passcodeHash: 'x', inCohort: false, isAdmin: false });

  const d = await buildDashboard(db, new Date('2026-08-01T02:00:00Z'), START);
  expect(d.find((r) => r.name === 'Cas')).toBeUndefined();
});

test('counts only today\'s sessions and resolves phase/day for an in-progress member', async () => {
  const { db } = await makeTestDb();
  const [a] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();

  await db.insert(sessionLogs).values([
    { memberId: a.id, localDate: '2026-08-15', phase: 'within', sessionType: 'easy', rpe: 4, durationMin: 30, distanceKm: '5.0' },
    { memberId: a.id, localDate: '2026-08-15', phase: 'within', sessionType: 'long', rpe: 6, durationMin: 60, distanceKm: '10.0' },
    { memberId: a.id, localDate: '2026-08-14', phase: 'within', sessionType: 'easy', rpe: 3, durationMin: 20, distanceKm: '3.0' },
  ]);

  const NOW = new Date('2026-08-15T02:00:00Z'); // 09:00 Jakarta -> localDate 2026-08-15
  const d = await buildDashboard(db, NOW, START);
  const row = d.find((r) => r.name === 'Ana')!;
  expect(row.sessionCount).toBe(2);
  expect(row.phaseState).toBe('within');
  expect(row.dayIndex).toBe(14);
});

test('before the start date every cohort member is phase "pre"', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Deb', passcodeHash: 'x', inCohort: true, isAdmin: false });

  const d = await buildDashboard(db, new Date('2026-07-01T02:00:00Z'), START);
  const row = d.find((r) => r.name === 'Deb')!;
  expect(row.phaseState).toBe('pre');
  expect(row.checkedInToday).toBe(false);
});
