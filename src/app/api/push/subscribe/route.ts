import { db as prodDb } from '@/db/client';
import { requireMember } from '@/lib/session';
import { upsertSubscription, type WebPushSubscription } from '@/lib/push';

// Structural check on the untrusted request body. This route is reachable
// by direct POST (it is public in middleware so the service worker/browser
// can reach it before a page load), so the payload shape can never be
// trusted just because the client normally sends a real PushSubscription.
function isWebPushSubscription(value: unknown): value is WebPushSubscription {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.endpoint !== 'string' || v.endpoint.length === 0) return false;
  if (!v.keys || typeof v.keys !== 'object') return false;
  const keys = v.keys as Record<string, unknown>;
  return (
    typeof keys.p256dh === 'string' &&
    keys.p256dh.length > 0 &&
    typeof keys.auth === 'string' &&
    keys.auth.length > 0
  );
}

export async function POST(request: Request): Promise<Response> {
  const member = await requireMember();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!isWebPushSubscription(body)) {
    return new Response(null, { status: 400 });
  }

  await upsertSubscription(prodDb, member.id, body);
  return new Response(null, { status: 201 });
}
