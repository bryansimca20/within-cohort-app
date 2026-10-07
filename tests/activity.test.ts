import { makeTestDb } from './helpers/testDb';
import { dailyCheckins, members, sessionLogs } from '@/db/schema';
import { buildActivity } from '@/lib/activity';

// Baseline is days 0-13 (Aug 1-14), Within starts on day 14 (Aug 15).
const START = '2026-08-01';
const at = (localDate: string) => new Date(`${localDate}T02:00:00Z`); // 09:00 Jakarta

const checkin = (memberId: string, localDate: string, phase: 'baseline' | 'within' = 'baseline') => ({
  memberId,
  localDate,
  phase,
  recovery: 72,
  restingHr: 48,
  sleepMinutes: 450,
  hooperSleep: 3,
  hooperFatigue: 2,
  hooperSoreness: 2,
  hooperStress: 1,
});

const session = (
  memberId: string,
  localDate: string,
  phase: 'baseline' | 'within',
  servings: number | null = null,
) => ({ memberId, localDate, phase, sessionType: 'easy' as const, rpe: 4, durationMin: 30, distanceKm: '5.00', servings });

type TestDb = Awaited<ReturnType<typeof makeTestDb>>['db'];

async function addMember(db: TestDb, name: string, inCohort = true) {
  const [m] = await db.insert(members).values({ name, passcodeHash: 'x', inCohort, isAdmin: false }).returning();
  return m;
}

test('lays out every elapsed protocol day oldest first, with unlogged days as gaps', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana');
  await db.insert(dailyCheckins).values([checkin(ana.id, '2026-08-01'), checkin(ana.id, '2026-08-03')]);

  const [row] = await buildActivity(db, at('2026-08-04'), START);

  expect(row.days.map((d) => d.localDate)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']);
  expect(row.days.map((d) => d.checkin !== null)).toEqual([true, false, true, false]);
  expect(row.checkinCount).toBe(2);
});

test('keeps a day that has sessions but no check-in', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana');
  await db.insert(sessionLogs).values([session(ana.id, '2026-08-02', 'baseline'), session(ana.id, '2026-08-02', 'baseline')]);

  const [row] = await buildActivity(db, at('2026-08-02'), START);

  expect(row.days[1].checkin).toBeNull();
  expect(row.days[1].sessions).toHaveLength(2);
  expect(row.checkinCount).toBe(0);
});

test('totals servings per Within day and leaves days without that data null', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana');
  await db.insert(sessionLogs).values([
    session(ana.id, '2026-08-14', 'baseline'), // last baseline day: no product
    session(ana.id, '2026-08-15', 'within', 1),
    session(ana.id, '2026-08-15', 'within', 2),
    session(ana.id, '2026-08-16', 'within', 0), // trained, took none
  ]);

  const [row] = await buildActivity(db, at('2026-08-17'), START);
  const servingsOn = (date: string) => row.days.find((d) => d.localDate === date)?.servings;

  expect(servingsOn('2026-08-14')).toBeNull();
  expect(servingsOn('2026-08-15')).toBe(3);
  expect(servingsOn('2026-08-16')).toBe(0);
  expect(servingsOn('2026-08-17')).toBeNull(); // Within day, no session logged
});

test('keeps each member to their own rows', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana');
  const bo = await addMember(db, 'Bo');
  await db.insert(dailyCheckins).values(checkin(ana.id, '2026-08-01'));
  await db.insert(sessionLogs).values(session(bo.id, '2026-08-01', 'baseline'));

  const rows = await buildActivity(db, at('2026-08-01'), START);
  const byName = (name: string) => rows.find((r) => r.name === name);

  expect(byName('Ana')?.checkinCount).toBe(1);
  expect(byName('Ana')?.days[0].sessions).toHaveLength(0);
  expect(byName('Bo')?.checkinCount).toBe(0);
  expect(byName('Bo')?.days[0].sessions).toHaveLength(1);
});

test('excludes members not currently in the cohort', async () => {
  const { db } = await makeTestDb();
  await addMember(db, 'Cas', false);

  expect(await buildActivity(db, at('2026-08-02'), START)).toEqual([]);
});

test('sorts the quietest member first and counts days since the last check-in', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana'); // checked in today
  const bo = await addMember(db, 'Bo'); // last checked in 3 days ago
  await addMember(db, 'Cy'); // never checked in
  await db.insert(dailyCheckins).values([checkin(ana.id, '2026-08-05'), checkin(bo.id, '2026-08-02')]);

  const rows = await buildActivity(db, at('2026-08-05'), START);

  expect(rows.map((r) => [r.name, r.daysQuiet, r.lastCheckinDate, r.checkedInToday])).toEqual([
    ['Cy', 5, null, false], // all 5 elapsed days
    ['Bo', 3, '2026-08-02', false],
    ['Ana', 0, '2026-08-05', true],
  ]);
});

test('freezes on the last protocol day once the 6 weeks are over', async () => {
  const { db } = await makeTestDb();
  const ana = await addMember(db, 'Ana');
  // Day 41 (Sep 11) is the last protocol day; Sep 20 is outside the window.
  await db.insert(dailyCheckins).values([checkin(ana.id, '2026-09-10', 'within'), checkin(ana.id, '2026-09-20', 'within')]);

  const [row] = await buildActivity(db, at('2026-09-30'), START);

  expect(row.days).toHaveLength(42);
  expect(row.days[41].localDate).toBe('2026-09-11');
  expect(row.checkinCount).toBe(1);
  expect(row.daysQuiet).toBe(1);
  expect(row.checkedInToday).toBe(false);
});

test('before the start date there are no days to show', async () => {
  const { db } = await makeTestDb();
  await addMember(db, 'Deb');

  const [row] = await buildActivity(db, at('2026-07-01'), START);

  expect(row.days).toEqual([]);
  expect(row.daysQuiet).toBe(0);
});
