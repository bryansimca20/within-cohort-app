import { makeTestDb } from './helpers/testDb';
import { members, sessionLogs } from '@/db/schema';
import { saveSession } from '@/app/(app)/session/actions';

const START = '2026-08-01';
const valid = { sessionType: 'easy', rpe: 5, durationMin: 30, distanceKm: 12.3, note: '' };

async function seedMember(db: Awaited<ReturnType<typeof makeTestDb>>['db']) {
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  return m;
}

test('two saves same member+day create two rows (insert, not upsert)', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, valid, new Date('2026-08-01T02:00:00Z'), START); // 09:00 Jakarta, day 0
  await saveSession(db, m, valid, new Date('2026-08-01T05:00:00Z'), START); // same local day
  const rows = await db.select().from(sessionLogs);
  expect(rows).toHaveLength(2);
});

test('phase stamped baseline on day 0 and within on day 14', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, valid, new Date('2026-08-01T02:00:00Z'), START); // day 0 -> baseline
  await saveSession(db, m, valid, new Date('2026-08-15T02:00:00Z'), START); // day 14 -> within
  const rows = await db.select().from(sessionLogs).orderBy(sessionLogs.localDate);
  expect(rows).toHaveLength(2);
  expect(rows[0].phase).toBe('baseline');
  expect(rows[1].phase).toBe('within');
});

test('servings is forced null in baseline even when a count is given, and preserved in within', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, { ...valid, servings: 2 }, new Date('2026-08-01T02:00:00Z'), START); // baseline
  await saveSession(db, m, { ...valid, servings: 2 }, new Date('2026-08-15T02:00:00Z'), START); // within
  const rows = await db.select().from(sessionLogs).orderBy(sessionLogs.localDate);
  expect(rows[0].phase).toBe('baseline');
  expect(rows[0].servings).toBeNull();
  expect(rows[1].phase).toBe('within');
  expect(rows[1].servings).toBe(2);
});

test('zero servings in within is stored as 0, not collapsed to null', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, { ...valid, servings: 0 }, new Date('2026-08-15T02:00:00Z'), START); // within
  const rows = await db.select().from(sessionLogs);
  expect(rows[0].servings).toBe(0);
});

test('servings omitted stores null in within phase too', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, valid, new Date('2026-08-15T02:00:00Z'), START); // within, no servings given
  const rows = await db.select().from(sessionLogs);
  expect(rows[0].servings).toBeNull();
});

test('distanceKm round-trips through numeric(5,2)', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, valid, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(sessionLogs);
  expect(rows[0].distanceKm).toBe('12.30');
});

// A watch reports two decimals, and the column used to be numeric(4,1), which
// rounded the second one away on write.
test('distanceKm keeps both decimal places a watch reports', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, { ...valid, distanceKm: 5.25 }, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(sessionLogs);
  expect(rows[0].distanceKm).toBe('5.25');
});

// The bug that stopped comma-locale members logging accurately: their keypad
// has no '.' key, so the form posts '5,25'.
test('distanceKm accepts a comma-separated string from a comma-decimal keypad', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await saveSession(db, m, { ...valid, distanceKm: '5,25' }, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(sessionLogs);
  expect(rows[0].distanceKm).toBe('5.25');
});

test('rejects before cohort start', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await expect(saveSession(db, m, valid, new Date('2026-08-01T02:00:00Z'), '2026-08-10')).rejects.toThrow(/not started/i);
});

test('rejects sessionType other without sessionTypeOther', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await expect(saveSession(db, m, { ...valid, sessionType: 'other' }, new Date('2026-08-01T02:00:00Z'), START)).rejects.toThrow();
});

// The text distance field accepts either separator, so a comma keypad can
// leave a bare ',' behind. The action wrapper redirects on it; the core is the
// backstop for a direct POST, and must reject rather than store a 0.
test('rejects a distance that is only a separator', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  await expect(
    saveSession(db, m, { ...valid, distanceKm: ',' }, new Date('2026-08-01T02:00:00Z'), START)
  ).rejects.toThrow();
  expect(await db.select().from(sessionLogs)).toHaveLength(0);
});
