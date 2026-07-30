import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { LoginFlow } from '@/components/LoginFlow';

// Reads the live roster from the DB, so it must render per request, never at
// build time — otherwise `next build` tries to prerender it and queries a
// database that may have no tables yet (or is unreachable from the build env).
export const dynamic = 'force-dynamic';

/** Login route: loads the roster server-side, hands off to the client keypad flow. */
export default async function LoginPage() {
  const roster = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .orderBy(asc(members.name));

  return <LoginFlow roster={roster} />;
}
