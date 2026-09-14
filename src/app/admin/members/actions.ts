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
// new member. Writes the hash (what login verifies) and the plaintext (what a
// founder can later reveal to remind a member of their code). Returns the
// plaintext so the caller can show it immediately; never logs it.
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
      passcodePlain: plaintext,
      inCohort: input.inCohort,
      isAdmin: input.isAdmin,
    })
    .returning();

  return { member, plaintext };
}

// Pure, testable core: regenerate a member's passcode in place, overwriting
// both the hash and the stored plaintext. The previous passcode stops working
// and stops being revealable. Returns the new plaintext for immediate display.
export async function resetMemberPasscode(db: AnyPgDatabase, memberId: string): Promise<{ plaintext: string }> {
  const plaintext = generatePasscode();
  const passcodeHash = await hashPasscode(plaintext);

  await db.update(members).set({ passcodeHash, passcodePlain: plaintext }).where(eq(members.id, memberId));

  return { plaintext };
}

// Pure, testable core: read back a member's passcode so an admin can remind
// them of it. Returns null when the member is unknown, or when the row predates
// plaintext storage and only has a hash (unrecoverable by design).
export async function getMemberPasscode(db: AnyPgDatabase, memberId: string): Promise<string | null> {
  const [row] = await db
    .select({ passcodePlain: members.passcodePlain })
    .from(members)
    .where(eq(members.id, memberId));

  return row?.passcodePlain ?? null;
}

export type UpdateMemberInput = {
  name: string;
  inCohort: boolean;
  isAdmin: boolean;
};

// Pure, testable core: update a member's name and cohort flags. Never touches
// passcodeHash or passcodePlain, so a rename leaves the member's login intact.
// Start date and timezone are cohort-wide config, not per-member, so they are
// not settable here.
export async function updateMember(
  db: AnyPgDatabase,
  memberId: string,
  input: UpdateMemberInput,
): Promise<Member> {
  const [member] = await db
    .update(members)
    .set({
      name: input.name,
      inCohort: input.inCohort,
      isAdmin: input.isAdmin,
    })
    .where(eq(members.id, memberId))
    .returning();

  return member;
}

// ---------------------------------------------------------------------------
// Server-action wrappers. Each is admin-gated first, then parses FormData and
// calls the matching pure core against the prod db. addMemberAction,
// resetPasscodeAction and revealPasscodeAction return a passcode in the action
// state (used with useActionState from a client component) so the UI can render
// it on demand. A passcode never goes into a redirect/query string, so it never
// lands in browser history, and it is never logged.
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

export type RevealPasscodeState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; plaintext: string };

export async function revealPasscodeAction(
  _prevState: RevealPasscodeState,
  formData: FormData,
): Promise<RevealPasscodeState> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');
  if (!memberId) {
    return { status: 'error', message: 'Missing member.' };
  }

  const plaintext = await getMemberPasscode(prodDb, memberId);
  if (!plaintext) {
    return { status: 'error', message: 'Not stored. Reset to issue a new one.' };
  }

  return { status: 'success', plaintext };
}

export async function updateMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const memberId = String(formData.get('memberId') ?? '');
  if (!memberId) return;

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const inCohort = formData.get('inCohort') === 'on';
  const isAdmin = formData.get('isAdmin') === 'on';

  await updateMember(prodDb, memberId, {
    name,
    inCohort,
    isAdmin,
  });

  revalidatePath('/admin/members');
}
