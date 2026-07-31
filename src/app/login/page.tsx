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

  // Same phone-frame treatment as the runner shell: full-bleed black on phones,
  // a centered phone-width column on a light backdrop for web. LoginFlow fills
  // this column (min-h-full flex-1) instead of the viewport.
  return (
    <div className="min-h-dvh bg-wi-black md:flex md:justify-center md:bg-wi-paper-dim md:py-8">
      <div className="flex min-h-dvh w-full flex-col bg-wi-black md:h-[calc(100dvh-4rem)] md:min-h-0 md:max-w-md md:overflow-hidden md:rounded-lg md:border md:border-wi-line md:shadow-(--wi-shadow-lg)">
        <LoginFlow roster={roster} />
      </div>
    </div>
  );
}
