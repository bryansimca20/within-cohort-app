'use server';
import { and, eq, isNull } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { members } from '@/db/schema';
import type * as schema from '@/db/schema';
import { requireMember } from '@/lib/session';

type Schema = typeof schema;
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

/** Stamp a member's first-run completion. Sets onboardedAt to `now` only where it is still null, so a repeat call never overwrites the original timestamp (the flow's own back button, or a double submit, stays safe). */
export async function markOnboarded(db: AnyPgDatabase, memberId: string, now: Date): Promise<void> {
  await db
    .update(members)
    .set({ onboardedAt: now })
    .where(and(eq(members.id, memberId), isNull(members.onboardedAt)));
}

/** "use server" wrapper for the Finish beat's form action: stamp the current member as onboarded, then send them to Today. Using redirect() here (not a client fetch) keeps navigation on the server. */
export async function completeOnboardingAction(): Promise<void> {
  const member = await requireMember();
  await markOnboarded(prodDb, member.id, new Date());
  redirect('/today');
}
