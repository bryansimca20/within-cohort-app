import { eq } from 'drizzle-orm';
import { WebPushError } from 'web-push';
import { db as prodDb } from '@/db/client';
import { pushSubscriptions } from '@/db/schema';
import { membersNeedingReminder } from '@/lib/reminders';
import { getCohortStartDate } from '@/lib/cohort';
import { sendPush } from '@/lib/push';

// Vercel Cron entry point (see vercel.json for the 07:00 Asia/Jakarta
// schedule): pushes a "morning check-in ready" reminder to every in-cohort
// member who has not yet checked in for their local today. This route is
// public in middleware (Vercel Cron has no session cookie), so CRON_SECRET
// is the actual gate - Vercel sends it as a Bearer token automatically once
// the env var is set on the project.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const due = await membersNeedingReminder(prodDb, new Date(), getCohortStartDate());

  let sent = 0;
  for (const member of due) {
    const subs = await prodDb.select().from(pushSubscriptions).where(eq(pushSubscriptions.memberId, member.id));

    for (const sub of subs) {
      try {
        await sendPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          { title: 'WITHIN', body: 'Morning check-in ready.' }
        );
        sent += 1;
      } catch (err) {
        // One dead subscription must not abort the batch - every other due
        // member still needs their reminder. A 404/410 means the push
        // service has permanently discarded the endpoint, so the stale row
        // is cleaned up; any other failure (network blip, 5xx) just skips
        // this send and leaves the row for the next cron run to retry.
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await prodDb.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }
  }

  return Response.json({ due: due.length, sent });
}
