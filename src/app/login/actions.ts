'use server';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { members } from '@/db/schema';
import * as schema from '@/db/schema';
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

export async function login(formData: FormData) {
  const memberId = String(formData.get('memberId') ?? '');
  const passcode = String(formData.get('passcode') ?? '');

  if (!memberId) redirect('/login?error=1');
  if (!rateLimit(memberId)) redirect('/login?error=rate');

  const ok = await authenticate(prodDb, memberId, passcode);
  if (!ok) redirect('/login?error=1');

  const s = await getSession();
  s.memberId = ok;
  await s.save();
  redirect('/today');
}

export async function logout() {
  const s = await getSession();
  s.destroy();
  redirect('/login');
}
