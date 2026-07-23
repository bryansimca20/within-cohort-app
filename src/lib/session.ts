import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { members, type Member } from '@/db/schema';

type SessionData = { memberId?: string };
const options = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'within_cohort',
  cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 90 },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), options);
}
export async function currentMember(): Promise<Member | null> {
  const s = await getSession();
  if (!s.memberId) return null;
  const [m] = await db.select().from(members).where(eq(members.id, s.memberId));
  return m ?? null;
}
export async function requireMember(): Promise<Member> {
  const m = await currentMember();
  if (!m) redirect('/login');
  return m;
}
export async function requireAdmin(): Promise<Member> {
  const m = await requireMember();
  if (!m.isAdmin) redirect('/today');
  return m;
}
