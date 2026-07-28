import { makeTestDb } from './helpers/testDb';
import { members, dailyCheckins } from '@/db/schema';
import { saveCheckin } from '@/app/(app)/checkin/actions';

const START = '2026-08-01';
const valid = { recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: '' };

test('creates a checkin stamped baseline on day 0', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, valid, new Date('2026-08-01T02:00:00Z'), START); // 09:00 Jakarta, day 0
  const rows = await db.select().from(dailyCheckins);
  expect(rows).toHaveLength(1);
  expect(rows[0].phase).toBe('baseline');
});
test('second save same day updates, not duplicates', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, valid, new Date('2026-08-01T02:00:00Z'), START);
  await saveCheckin(db, m, { ...valid, recovery: 80 }, new Date('2026-08-01T05:00:00Z'), START);
  const rows = await db.select().from(dailyCheckins);
  expect(rows).toHaveLength(1);
  expect(rows[0].recovery).toBe(80);
});
test('rejects before cohort start', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await expect(saveCheckin(db, m, valid, new Date('2026-08-01T02:00:00Z'), '2026-08-10')).rejects.toThrow(/not started/i);
});
