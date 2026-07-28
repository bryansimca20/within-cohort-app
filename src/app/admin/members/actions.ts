'use server';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';
import { db as prodDb } from '@/db/client';
import { members, type Member } from '@/db/schema';
import type * as schema from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { generatePasscode, hashPasscode } from '@/lib/passcode';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

export type CreateMemberInput = {
  name: string;
  inCohort: boolean;
  isAdmin: boolean;
};

// Pure, testable core: generate a plaintext passcode, hash it, and insert a
// new member. Returns both the persisted member and the plaintext so the
// caller can show it exactly once; only the hash is ever written to the db,
// and this function never logs the plaintext.
export async function createMember(
  db: AnyPgDatabase,
  input: CreateMemberInput,
): Promise<{ member: Member; plaintext: string }> {
  const plaintext = generatePasscode();
  const passcodeHash = await hashPasscode(plaintext);

  const [member] = await db
    .insert(members)
    .values({
      name: input.name,
      passcodeHash,
      inCohort: input.inCohort,
      isAdmin: input.isAdmin,
    })
    .returning();

  return { member, plaintext };
}

// Pure, testable core: regenerate and re-hash a member's passcode in place.
// Returns the new plaintext so the caller can show it exactly once; the old
// hash is fully overwritten, so the previous passcode stops working.
export async function resetMemberPasscode(db: AnyPgDatabase, memberId: string): Promise<{ plaintext: string }> {
  const plaintext = generatePasscode();
  const passcodeHash = await hashPasscode(plaintext);

  await db.update(members).set({ passcodeHash }).where(eq(members.id, memberId));

  return { plaintext };
}

export type UpdateMemberFlagsInput = {
  inCohort: boolean;
  isAdmin: boolean;
};

// Pure, testable core: update a member's cohort flags. Never touches
// passcodeHash. Start date and timezone are cohort-wide config, not
// per-member, so they are not settable here.
export async function updateMemberFlags(
  db: AnyPgDatabase,
  memberId: string,
  input: UpdateMemberFlagsInput,
): Promise<Member> {
  const [member] = await db
    .update(members)
    .set({
      inCohort: input.inCohort,
      isAdmin: input.isAdmin,
    })
    .where(eq(members.id, memberId))
    .returning();

  return member;
}

// ---------------------------------------------------------------------------
// Server-action wrappers. Each is admin-gated first, then parses FormData and
// calls the matching pure core against the prod db. addMemberAction and
// resetPasscodeAction return the freshly generated plaintext in the action
// state (used with useActionState from a client component) so the UI can
// render it exactly once. The plaintext never goes into a redirect/query
// string, so it never lands in browser history, and it is never logged.
// ---------------------------------------------------------------------------

export type AddMemberState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; name: string; plaintext: string };

export async function addMemberAction(_prevState: AddMemberState, formData: FormData): Promise<AddMemberState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { status: 'error', message: 'Name is required.' };
  }

  const inCohort = formData.get('inCohort') === 'on';
  const isAdmin = formData.get('isAdmin') === 'on';

  const { member, plaintext } = await createMember(prodDb, {
    name,
    inCohort,
    isAdmin,
  });

  revalidatePath('/admin/members');
  return { status: 'success', name: member.name, plaintext };
}

export type ResetPasscodeState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; name: string; plaintext: string };

export async function resetPasscodeAction(
  _prevState: ResetPasscodeState,
  formData: FormData,
): Promise<ResetPasscodeState> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');
  const name = String(formData.get('name') ?? '');
  if (!memberId) {
    return { status: 'error', message: 'Missing member.' };
  }

  const { plaintext } = await resetMemberPasscode(prodDb, memberId);

  revalidatePath('/admin/members');
  return { status: 'success', name, plaintext };
}

export async function updateFlagsAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');
  if (!memberId) return;

  const inCohort = formData.get('inCohort') === 'on';
  const isAdmin = formData.get('isAdmin') === 'on';

  await updateMemberFlags(prodDb, memberId, {
    inCohort,
    isAdmin,
  });

  revalidatePath('/admin/members');
}
