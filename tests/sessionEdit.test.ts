import { eq } from 'drizzle-orm';
import { makeTestDb } from './helpers/testDb';
import { members, sessionLogs } from '@/db/schema';
import { saveSession, updateSession, deleteSession } from '@/app/(app)/session/actions';

const START = '2026-08-01';
const valid = { sessionType: 'easy', rpe: 5, durationMin: 30, distanceKm: 12.3, note: '' };

type Db = Awaited<ReturnType<typeof makeTestDb>>['db'];

async function seedMember(db: Db, name = 'Ana') {
  const [m] = await db.insert(members).values({ name, passcodeHash: 'x', inCohort: true, isAdmin: false }).returning();
  return m;
}
async function seedSession(db: Db, m: Awaited<ReturnType<typeof seedMember>>, now: Date) {
  await saveSession(db, m, valid, now, START);
  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.memberId, m.id));
  return row;
}

test('updateSession changes metrics but preserves localDate and phase', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const created = await seedSession(db, m, new Date('2026-08-01T02:00:00Z')); // baseline, day 0
  await updateSession(
    db, m, created.id,
    { ...valid, sessionType: 'long', rpe: 8, durationMin: 55, distanceKm: 20 },
    new Date('2026-08-01T05:00:00Z'), START,
  );
  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, created.id));
  expect(row.sessionType).toBe('long');
  expect(row.rpe).toBe(8);
  expect(row.durationMin).toBe(55);
  expect(row.distanceKm).toBe('20.0');
  expect(row.localDate).toBe(created.localDate);
  expect(row.phase).toBe('baseline');
});

test('updateSession forces tookServing null for a baseline row even when editing during within', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const created = await seedSession(db, m, new Date('2026-08-01T02:00:00Z')); // baseline
  await updateSession(db, m, created.id, { ...valid, tookServing: true }, new Date('2026-08-15T02:00:00Z'), START); // now within
  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, created.id));
  expect(row.phase).toBe('baseline');
  expect(row.tookServing).toBeNull();
});

test('updateSession keeps tookServing for a within row', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const created = await seedSession(db, m, new Date('2026-08-15T02:00:00Z')); // within
  await updateSession(db, m, created.id, { ...valid, tookServing: true }, new Date('2026-08-16T02:00:00Z'), START);
  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, created.id));
  expect(row.tookServing).toBe(true);
});

test('updateSession rejects a session owned by another member', async () => {
  const { db } = await makeTestDb();
  const owner = await seedMember(db, 'Ana');
  const other = await seedMember(db, 'Budi');
  const created = await seedSession(db, owner, new Date('2026-08-01T02:00:00Z'));
  await expect(updateSession(db, other, created.id, { ...valid, rpe: 9 }, new Date('2026-08-01T05:00:00Z'), START)).rejects.toThrow();
  const [row] = await db.select().from(sessionLogs).where(eq(sessionLogs.id, created.id));
  expect(row.rpe).toBe(5);
});

test('updateSession rejects when the protocol is complete', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const created = await seedSession(db, m, new Date('2026-08-15T02:00:00Z')); // within
  await expect(updateSession(db, m, created.id, { ...valid, rpe: 9 }, new Date('2026-08-29T02:00:00Z'), START)).rejects.toThrow(/complete/i);
});

test('deleteSession removes the target row and leaves other sessions', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const first = await seedSession(db, m, new Date('2026-08-01T02:00:00Z'));
  await saveSession(db, m, valid, new Date('2026-08-01T05:00:00Z'), START); // second session, same day
  await deleteSession(db, m, first.id, new Date('2026-08-01T06:00:00Z'), START);
  const rows = await db.select().from(sessionLogs).where(eq(sessionLogs.memberId, m.id));
  expect(rows).toHaveLength(1);
  expect(rows[0].id).not.toBe(first.id);
});

test('deleteSession rejects a session owned by another member', async () => {
  const { db } = await makeTestDb();
  const owner = await seedMember(db, 'Ana');
  const other = await seedMember(db, 'Budi');
  const created = await seedSession(db, owner, new Date('2026-08-01T02:00:00Z'));
  await expect(deleteSession(db, other, created.id, new Date('2026-08-01T05:00:00Z'), START)).rejects.toThrow();
  const rows = await db.select().from(sessionLogs);
  expect(rows).toHaveLength(1);
});

test('deleteSession rejects when the protocol is complete', async () => {
  const { db } = await makeTestDb();
  const m = await seedMember(db);
  const created = await seedSession(db, m, new Date('2026-08-15T02:00:00Z'));
  await expect(deleteSession(db, m, created.id, new Date('2026-08-29T02:00:00Z'), START)).rejects.toThrow(/complete/i);
  const rows = await db.select().from(sessionLogs);
  expect(rows).toHaveLength(1);
});
