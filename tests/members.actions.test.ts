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
  });

  expect(member.name).toBe('Ana');
  expect(member.inCohort).toBe(true);
  expect(member.isAdmin).toBe(false);
  expect(plaintext).toMatch(/^\d{4}$/);

  const [row] = await db.select().from(members).where(eq(members.id, member.id));
  expect(row.passcodeHash).not.toBe(plaintext);
  expect(await verifyPasscode(plaintext, row.passcodeHash)).toBe(true);
});

test('resetMemberPasscode changes the hash and the new plaintext verifies', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'old-hash', inCohort: true, isAdmin: false })
    .returning();

  const { plaintext } = await resetMemberPasscode(db, m.id);
  expect(plaintext).toMatch(/^\d{4}$/);

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.passcodeHash).not.toBe('old-hash');
  expect(await verifyPasscode(plaintext, row.passcodeHash)).toBe(true);
});

test('resetMemberPasscode generates a different plaintext than a prior reset', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'old-hash', inCohort: true, isAdmin: false })
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

test('updateMemberFlags updates the cohort and admin flags', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: false, isAdmin: false })
    .returning();

  const updated = await updateMemberFlags(db, m.id, {
    inCohort: true,
    isAdmin: true,
  });

  expect(updated.inCohort).toBe(true);
  expect(updated.isAdmin).toBe(true);

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.inCohort).toBe(true);
  expect(row.isAdmin).toBe(true);
});
