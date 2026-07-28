'use server';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { verifyPasscode } from '@/lib/passcode';
import { getSession } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

// Pure, testable core: given a db handle, a member id, and a plaintext
// passcode, resolve whether it's correct. No cookies, no redirects, no rate
// limiting; those live in the `login` server action below so this stays
// trivial to exercise against the pglite test harness.
export async function authenticate(db: AnyPgDatabase, memberId: string, passcode: string): Promise<string | null> {
  if (!memberId) return null;
  const [m] = await db.select().from(members).where(eq(members.id, memberId));
  if (!m) return null;
  return (await verifyPasscode(passcode, m.passcodeHash)) ? m.id : null;
}

// Standard 8-4-4-4-12 hex UUID shape. Members are looked up by `id` (a uuid
// column), so anything that isn't UUID-shaped can never match a real member.
// Rejecting those before they reach `rateLimit` keeps an attacker who posts
// arbitrary junk `memberId` values from growing the rate limiter's bucket
// Map without bound.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function login(formData: FormData) {
  const memberId = String(formData.get('memberId') ?? '');
  const passcode = String(formData.get('passcode') ?? '');

  if (!memberId) redirect('/login?error=1');
  if (!UUID_RE.test(memberId)) redirect('/login?error=1');
  if (!rateLimit(memberId)) redirect('/login?error=rate');

  const ok = await authenticate(prodDb, memberId, passcode);
  if (!ok) redirect('/login?error=1');

  const s = await getSession();
  s.memberId = ok;
  await s.save();
  redirect('/today');
}

// Type-only export from a "use server" file: erased at compile time (no
// runtime binding), so it doesn't trip the "use server" files may only
// export async functions" constraint. Same convention already used by
// admin/members/actions.ts (CreateMemberInput, AddMemberState, etc.).
export type LoginState = { ok: true } | { error: 'wrong' | 'rate' } | null;

/** State-returning counterpart to `login` for the keypad LoginFlow (Task 8): same guard/rate-limit/authenticate flow, but resolves to a LoginState instead of redirecting. */
export async function loginAttempt(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const memberId = String(formData.get('memberId') ?? '');
  const passcode = String(formData.get('passcode') ?? '');
  if (!memberId || !UUID_RE.test(memberId)) return { error: 'wrong' };
  if (!rateLimit(memberId)) return { error: 'rate' };
  const ok = await authenticate(prodDb, memberId, passcode);
  if (!ok) return { error: 'wrong' };
  const s = await getSession();
  s.memberId = ok;
  await s.save();
  return { ok: true };
}

export async function logout() {
  const s = await getSession();
  s.destroy();
  redirect('/login');
}
