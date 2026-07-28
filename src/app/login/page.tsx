import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { LoginFlow } from '@/components/LoginFlow';

/** Login route: loads the roster server-side, hands off to the client keypad flow. */
export default async function LoginPage() {
  const roster = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .orderBy(asc(members.name));

  return <LoginFlow roster={roster} />;
}
