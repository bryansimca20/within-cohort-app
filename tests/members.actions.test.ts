import { eq } from 'drizzle-orm';
import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { verifyPasscode } from '@/lib/passcode';
import { createMember, resetMemberPasscode, updateMemberFlags } from '@/app/admin/members/actions';

test('createMember inserts a member and returns a plaintext that verifies against the stored hash', async () => {
  const { db } = await makeTestDb();
  const { member, plaintext } = await createMember(db, {
    name: 'Ana',
    inCohort: true,
    isAdmin: false,
    cohortStartDate: '2026-08-01',
    timezone: 'Asia/Jakarta',
  });

  expect(member.name).toBe('Ana');
  expect(member.inCohort).toBe(true);
  expect(member.isAdmin).toBe(false);
  expect(member.cohortStartDate).toBe('2026-08-01');
  expect(member.timezone).toBe('Asia/Jakarta');
  expect(plaintext).toMatch(/^RUN-\d{4}$/);

  const [row] = await db.select().from(members).where(eq(members.id, member.id));
  expect(row.passcodeHash).not.toBe(plaintext);
  expect(await verifyPasscode(plaintext, row.passcodeHash)).toBe(true);
});

test('createMember defaults cohortStartDate to null when not provided', async () => {
  const { db } = await makeTestDb();
  const { member } = await createMember(db, {
    name: 'Budi',
    inCohort: false,
    isAdmin: true,
    cohortStartDate: null,
    timezone: 'Asia/Jakarta',
  });
  expect(member.cohortStartDate).toBeNull();
});

test('resetMemberPasscode changes the hash and the new plaintext verifies', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'old-hash', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' })
    .returning();

  const { plaintext } = await resetMemberPasscode(db, m.id);
  expect(plaintext).toMatch(/^RUN-\d{4}$/);

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.passcodeHash).not.toBe('old-hash');
  expect(await verifyPasscode(plaintext, row.passcodeHash)).toBe(true);
});

test('resetMemberPasscode generates a different plaintext than a prior reset', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'old-hash', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' })
    .returning();

  const first = await resetMemberPasscode(db, m.id);
  const [afterFirst] = await db.select().from(members).where(eq(members.id, m.id));
  expect(await verifyPasscode(first.plaintext, afterFirst.passcodeHash)).toBe(true);

  const second = await resetMemberPasscode(db, m.id);
  const [afterSecond] = await db.select().from(members).where(eq(members.id, m.id));
  expect(await verifyPasscode(second.plaintext, afterSecond.passcodeHash)).toBe(true);
  // the first plaintext must no longer verify against the row after a second reset
  expect(await verifyPasscode(first.plaintext, afterSecond.passcodeHash)).toBe(false);
});

test('updateMemberFlags updates flags, start date, and timezone', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: false, isAdmin: false, cohortStartDate: null, timezone: 'Asia/Jakarta' })
    .returning();

  const updated = await updateMemberFlags(db, m.id, {
    inCohort: true,
    isAdmin: true,
    cohortStartDate: '2026-09-01',
    timezone: 'America/New_York',
  });

  expect(updated.inCohort).toBe(true);
  expect(updated.isAdmin).toBe(true);
  expect(updated.cohortStartDate).toBe('2026-09-01');
  expect(updated.timezone).toBe('America/New_York');

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.inCohort).toBe(true);
  expect(row.cohortStartDate).toBe('2026-09-01');
});

test('updateMemberFlags can clear the cohort start date back to null', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' })
    .returning();

  const updated = await updateMemberFlags(db, m.id, {
    inCohort: true,
    isAdmin: false,
    cohortStartDate: null,
    timezone: 'Asia/Jakarta',
  });

  expect(updated.cohortStartDate).toBeNull();
});
