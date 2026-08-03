import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import webpush, { WebPushError } from 'web-push';
import { pushSubscriptions } from '@/db/schema';
import type * as schema from '@/db/schema';

type Schema = typeof schema;
// Any drizzle Postgres-family driver (postgres-js in prod, pglite in tests)
// implements PgDatabase for some query-result shape. Typing the parameter
// against the shared base, instead of the concrete prod driver type, is what
// lets the pglite test harness pass a real db handle into this function.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>;

// The Web Push standard's PushSubscription JSON shape (what
// `PushSubscription.toJSON()` on the client, and `pushManager.subscribe()`'s
// resolved value, produce).
export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Pure, testable core: store (or re-home) a push subscription by endpoint.
// A browser endpoint is globally unique, so any existing row for it is
// deleted before inserting fresh - this makes re-subscribing idempotent and
// re-assigns the endpoint to whichever member just subscribed with it.
export async function upsertSubscription(
  db: AnyPgDatabase,
  memberId: string,
  sub: WebPushSubscription
): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
  await db.insert(pushSubscriptions).values({
    memberId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
}

let vapidConfigured = false;

// VAPID details are read from env lazily, on first send, rather than at
// module load. Configuring at import time would throw whenever this module
// is imported without the env vars set (tests, or a build without prod
// secrets), which would break importing it transitively from anywhere else.
function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

/** Send one Web Push notification; payload is serialized to JSON. */
export async function sendPush(sub: WebPushSubscription, payload: Record<string, unknown>): Promise<void> {
  ensureVapidConfigured();
  await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
}

export type TestPushResult = { devices: number; sent: number; failed: number };

// Send a one-off "push is working" notification to every device a member has
// registered, for verifying the production Web Push pipeline end to end (VAPID
// keys, subscription storage, delivery). Mirrors the reminder cron's dead-row
// cleanup: a 404/410 means the endpoint is permanently gone, so that row is
// deleted; any other failure is counted and left for a later retry. Returns
// how many devices were targeted and how many sends the push service accepted.
export async function sendTestPush(db: AnyPgDatabase, memberId: string): Promise<TestPushResult> {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.memberId, memberId));

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title: 'WITHIN', body: 'Test notification. Push is working.' }
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { devices: subs.length, sent, failed };
}
