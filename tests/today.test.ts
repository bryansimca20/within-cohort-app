import { makeTestDb } from './helpers/testDb';
import { members, dailyCheckins, sessionLogs } from '@/db/schema';
import { getTodayStatus } from '@/lib/today';

const START = '2026-08-01';
const NOW = new Date('2026-08-15T02:00:00Z'); // 09:00 Jakarta -> localDate 2026-08-15

async function seedMember(db: Awaited<ReturnType<typeof makeTestDb>>['db']) {
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();
  return m;
}

test('checkinDone is false before a checkin exists, true after', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  const before = await getTodayStatus(db, m, NOW, START);
  expect(before.checkinDone).toBe(false);
  expect(before.localDate).toBe('2026-08-15');
  expect(before.phaseState).toBe('within');
  expect(before.dayIndex).toBe(14);
  expect(before.phaseComplete).toBe(false);

  await db.insert(dailyCheckins).values({
    memberId: m.id,
    localDate: '2026-08-15',
    phase: 'within',
    recovery: 72,
    restingHr: 48,
    sleepMinutes: 450,
    hooperSleep: 3,
    hooperFatigue: 2,
    hooperSoreness: 2,
    hooperStress: 1,
  });

  const after = await getTodayStatus(db, m, NOW, START);
  expect(after.checkinDone).toBe(true);
});

test('sessionCount counts only sessions logged today', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  await db.insert(sessionLogs).values([
    { memberId: m.id, localDate: '2026-08-15', phase: 'within', sessionType: 'easy', rpe: 4, durationMin: 30, distanceKm: '5.0' },
    { memberId: m.id, localDate: '2026-08-15', phase: 'within', sessionType: 'long', rpe: 6, durationMin: 60, distanceKm: '10.0' },
    { memberId: m.id, localDate: '2026-08-14', phase: 'within', sessionType: 'easy', rpe: 3, durationMin: 20, distanceKm: '3.0' },
  ]);

  const status = await getTodayStatus(db, m, NOW, START);
  expect(status.sessionCount).toBe(2);
});

test('streak reflects seeded checkin dates', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  await db.insert(dailyCheckins).values([
    { memberId: m.id, localDate: '2026-08-15', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-14', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-13', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-11', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
  ]);

  const status = await getTodayStatus(db, m, NOW, START);
  expect(status.streak).toBe(3);
});

test('a start date in the future puts the member in the pre phase', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  const status = await getTodayStatus(db, m, NOW, '2026-09-01');
  expect(status.phaseState).toBe('pre');
  expect(status.dayIndex).toBeLessThan(0);
  expect(status.phaseComplete).toBe(false);
});

test('baselineLogged and withinLogged count distinct checkin dates per phase', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  await db.insert(dailyCheckins).values([
    { memberId: m.id, localDate: '2026-08-01', phase: 'baseline', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-05', phase: 'baseline', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-10', phase: 'baseline', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-15', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
    { memberId: m.id, localDate: '2026-08-20', phase: 'within', recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 },
  ]);

  const status = await getTodayStatus(db, m, NOW, START);
  expect(status.baselineLogged).toBe(3);
  expect(status.withinLogged).toBe(2);
});

test('baselineLogged and withinLogged are zero with no checkins', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);

  const status = await getTodayStatus(db, m, NOW, START);
  expect(status.baselineLogged).toBe(0);
  expect(status.withinLogged).toBe(0);
});
