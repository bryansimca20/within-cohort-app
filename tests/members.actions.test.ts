import { eq } from 'drizzle-orm';
import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { verifyPasscode } from '@/lib/passcode';
import { createMember, getMemberPasscode, resetMemberPasscode, updateMember } from '@/app/admin/members/actions';

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

test('createMember stores the plaintext passcode alongside the hash', async () => {
  const { db } = await makeTestDb();
  const { member, plaintext } = await createMember(db, {
    name: 'Ana',
    inCohort: true,
    isAdmin: false,
  });

  const [row] = await db.select().from(members).where(eq(members.id, member.id));
  expect(row.passcodePlain).toBe(plaintext);
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

test('resetMemberPasscode overwrites the stored plaintext with the new code', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'old-hash', passcodePlain: '1111', inCohort: true, isAdmin: false })
    .returning();

  const { plaintext } = await resetMemberPasscode(db, m.id);

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.passcodePlain).toBe(plaintext);
  expect(row.passcodePlain).not.toBe('1111');
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

test('getMemberPasscode returns the stored plaintext for a member', async () => {
  const { db } = await makeTestDb();
  const { member, plaintext } = await createMember(db, { name: 'Ana', inCohort: true, isAdmin: false });

  expect(await getMemberPasscode(db, member.id)).toBe(plaintext);
});

test('getMemberPasscode returns null for a member stored before plaintext was kept', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Legacy', passcodeHash: 'hash-only', inCohort: true, isAdmin: false })
    .returning();

  expect(await getMemberPasscode(db, m.id)).toBeNull();
});

test('getMemberPasscode returns null for an unknown member id', async () => {
  const { db } = await makeTestDb();

  expect(await getMemberPasscode(db, '00000000-0000-0000-0000-000000000000')).toBeNull();
});

test('updateMember updates the cohort and admin flags', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: false, isAdmin: false })
    .returning();

  const updated = await updateMember(db, m.id, {
    name: 'Ana',
    inCohort: true,
    isAdmin: true,
  });

  expect(updated.inCohort).toBe(true);
  expect(updated.isAdmin).toBe(true);

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.inCohort).toBe(true);
  expect(row.isAdmin).toBe(true);
});

test('updateMember renames a member', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false })
    .returning();

  const updated = await updateMember(db, m.id, {
    name: 'Ana Putri',
    inCohort: true,
    isAdmin: false,
  });

  expect(updated.name).toBe('Ana Putri');

  const [row] = await db.select().from(members).where(eq(members.id, m.id));
  expect(row.name).toBe('Ana Putri');
});

test('updateMember leaves the passcode untouched when renaming', async () => {
  const { db } = await makeTestDb();
  const { member, plaintext } = await createMember(db, { name: 'Ana', inCohort: true, isAdmin: false });
  const [before] = await db.select().from(members).where(eq(members.id, member.id));

  await updateMember(db, member.id, { name: 'Ana Putri', inCohort: true, isAdmin: false });

  const [after] = await db.select().from(members).where(eq(members.id, member.id));
  expect(after.passcodeHash).toBe(before.passcodeHash);
  expect(after.passcodePlain).toBe(plaintext);
});
