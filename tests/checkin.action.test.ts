import { makeTestDb } from './helpers/testDb';
import { members, dailyCheckins } from '@/db/schema';
import { isLateEntry } from '@/lib/history';
import { saveCheckin } from '@/app/(app)/checkin/actions';

const START = '2026-08-01';
const valid = { recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: '' };

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

test('stores the hrvMs reading on the checkin row', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, { ...valid, hrvMs: 52 }, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(dailyCheckins);
  expect(rows[0].hrvMs).toBe(52);
});

test('stores null hrvMs when the member leaves it blank', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, valid, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(dailyCheckins);
  expect(rows[0].hrvMs).toBeNull();
});

// The upsert feeds the same values object to onConflictDoUpdate, so clearing
// the field on a same-day edit has to write the null back rather than leave
// the morning's reading stranded on the row.
test('clearing hrvMs on a same-day edit nulls the stored reading', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, { ...valid, hrvMs: 52 }, new Date('2026-08-01T02:00:00Z'), START);
  await saveCheckin(db, m, valid, new Date('2026-08-01T05:00:00Z'), START);
  const rows = await db.select().from(dailyCheckins);
  expect(rows).toHaveLength(1);
  expect(rows[0].hrvMs).toBeNull();
});

// The whole point of the h:mm capture: a duration that is not a whole or half
// hour has to survive the write unchanged, which decimal hours could not do.
test('stores an odd sleep duration as exact minutes', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, { ...valid, sleepMinutes: 367 }, new Date('2026-08-01T02:00:00Z'), START);
  const rows = await db.select().from(dailyCheckins);
  expect(rows[0].sleepMinutes).toBe(367);
});

// --- backfill ------------------------------------------------------------
// A missed morning is recoverable from the watch long after the fact, so any
// protocol day is loggable until the window closes. The date is explicit; the
// clock only says when the write happened.

// The load-bearing rule of the whole feature: a baseline day filled in during
// the within phase must stamp baseline, or the comparison the protocol exists
// to produce is contaminated.
test('backfills onto an earlier day and stamps that day\'s phase, not today\'s', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  // now is 2026-08-20 Jakarta (day 19, within); the target is day 4, baseline
  await saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '2026-08-05');
  const rows = await db.select().from(dailyCheckins);
  expect(rows).toHaveLength(1);
  expect(rows[0].localDate).toBe('2026-08-05');
  expect(rows[0].phase).toBe('baseline');
});

test('records the real write instant on a backfilled row, not the day it describes', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '2026-08-05');
  const rows = await db.select().from(dailyCheckins);
  // createdAt is the database clock, so it is genuinely "now" here. The row is
  // late because its localDate is the backfilled day, not because of the stamp.
  expect(rows[0].localDate).toBe('2026-08-05');
  expect(Date.now() - rows[0].createdAt.getTime()).toBeLessThan(60_000);
  expect(isLateEntry(rows[0].localDate, rows[0].createdAt)).toBe(true);
});

// Editing a past log is the same code path as creating one, so the upsert must
// correct the values without rewriting the row's provenance.
test('editing a past check-in updates in place and preserves the original createdAt', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '2026-08-05');
  const [first] = await db.select().from(dailyCheckins);

  await saveCheckin(db, m, { ...valid, recovery: 91 }, new Date('2026-08-22T02:00:00Z'), START, '2026-08-05');

  const rows = await db.select().from(dailyCheckins);
  expect(rows).toHaveLength(1);
  expect(rows[0].recovery).toBe(91);
  expect(rows[0].createdAt.getTime()).toBe(first.createdAt.getTime());
});

test('rejects a target date that has not happened yet', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await expect(
    saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '2026-08-21'),
  ).rejects.toThrow(/has not happened/i);
});

test('rejects a target date before the cohort start', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await expect(
    saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '2026-07-30'),
  ).rejects.toThrow(/not started/i);
});

test('rejects a malformed target date before it reaches a query', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await expect(
    saveCheckin(db, m, valid, new Date('2026-08-20T02:00:00Z'), START, '05-08-2026'),
  ).rejects.toThrow(/YYYY-MM-DD/);
});

// The end of the window is not a deadline extension: unfilled gaps freeze.
test('rejects a backfill once the protocol is complete', async () => {
  const { db } = await makeTestDb();
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  await expect(
    saveCheckin(db, m, valid, new Date('2026-09-20T02:00:00Z'), START, '2026-08-05'),
  ).rejects.toThrow(/complete/i);
});
