import { vi } from 'vitest';
import { makeTestDb } from './helpers/testDb';
import { members, pushSubscriptions } from '@/db/schema';

// web-push talks to a real push service over the network, so the transport is
// stubbed: setVapidDetails is a no-op (keeps the test env-var free) and
// sendNotification is driven per-test. The DB behavior around it - device
// counting, sent/failed tallies, dead-row cleanup - is exercised for real
// against pglite. `WebPushError` must be the SAME class push.ts imports, so
// the mock exports it and the tests throw instances of it (the `instanceof`
// gate in sendTestPush only deletes rows for a genuine WebPushError).
const { sendNotification, setVapidDetails, MockWebPushError } = vi.hoisted(() => {
  class MockWebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = 'WebPushError';
      this.statusCode = statusCode;
    }
  }
  return { sendNotification: vi.fn(), setVapidDetails: vi.fn(), MockWebPushError };
});

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification },
  WebPushError: MockWebPushError,
}));

import { sendTestPush } from '@/lib/push';

beforeEach(() => {
  setVapidDetails.mockReset();
  sendNotification.mockReset();
  sendNotification.mockResolvedValue(undefined);
});

async function makeMember(db: Awaited<ReturnType<typeof makeTestDb>>['db'], name: string) {
  const [member] = await db
    .insert(members)
    .values({ name, passcodeHash: 'x', inCohort: true, isAdmin: true })
    .returning();
  return member;
}

async function addSub(db: Awaited<ReturnType<typeof makeTestDb>>['db'], memberId: string, endpoint: string) {
  await db.insert(pushSubscriptions).values({
    memberId,
    endpoint,
    p256dh: `p256dh-${endpoint}`,
    auth: `auth-${endpoint}`,
  });
}

test('reports zero devices when the member has no subscription (the "No device registered" case)', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');

  const result = await sendTestPush(db, member.id);

  expect(result).toEqual({ devices: 0, sent: 0, failed: 0 });
  expect(sendNotification).not.toHaveBeenCalled();
});

test('sends to every registered device and counts them all sent', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');
  await addSub(db, member.id, 'https://push.example/1');
  await addSub(db, member.id, 'https://push.example/2');

  const result = await sendTestPush(db, member.id);

  expect(result).toEqual({ devices: 2, sent: 2, failed: 0 });
  expect(sendNotification).toHaveBeenCalledTimes(2);
  // The payload is the test-notification body, serialized as JSON.
  expect(sendNotification).toHaveBeenCalledWith(
    expect.objectContaining({ endpoint: 'https://push.example/1' }),
    JSON.stringify({ title: 'WITHIN', body: 'Test notification. Push is working.' })
  );
  const rows = await db.select().from(pushSubscriptions);
  expect(rows).toHaveLength(2); // nothing deleted on success
});

test('deletes a subscription the push service reports as gone (404/410) and counts it failed', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');
  await addSub(db, member.id, 'https://push.example/live');
  await addSub(db, member.id, 'https://push.example/gone-410');
  await addSub(db, member.id, 'https://push.example/gone-404');

  // Keyed by endpoint so the result never depends on DB row order.
  sendNotification.mockImplementation((sub: { endpoint: string }) => {
    if (sub.endpoint === 'https://push.example/gone-410') return Promise.reject(new MockWebPushError('gone', 410));
    if (sub.endpoint === 'https://push.example/gone-404') return Promise.reject(new MockWebPushError('missing', 404));
    return Promise.resolve(undefined);
  });

  const result = await sendTestPush(db, member.id);

  expect(result).toEqual({ devices: 3, sent: 1, failed: 2 });
  const rows = await db.select().from(pushSubscriptions);
  expect(rows.map((r) => r.endpoint)).toEqual(['https://push.example/live']);
});

test('keeps a subscription on a transient failure (500) for a later retry', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');
  await addSub(db, member.id, 'https://push.example/flaky');

  sendNotification.mockRejectedValue(new MockWebPushError('server error', 500));

  const result = await sendTestPush(db, member.id);

  expect(result).toEqual({ devices: 1, sent: 0, failed: 1 });
  const rows = await db.select().from(pushSubscriptions);
  expect(rows).toHaveLength(1); // NOT deleted: 500 is retryable, not gone
});

test('a non-WebPush error is counted failed but never deletes the row', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');
  await addSub(db, member.id, 'https://push.example/oops');

  sendNotification.mockRejectedValue(new Error('boom'));

  const result = await sendTestPush(db, member.id);

  expect(result).toEqual({ devices: 1, sent: 0, failed: 1 });
  const rows = await db.select().from(pushSubscriptions);
  expect(rows).toHaveLength(1);
});

test('only targets the given member’s devices, never another member’s', async () => {
  const { db } = await makeTestDb();
  const ana = await makeMember(db, 'Ana');
  const budi = await makeMember(db, 'Budi');
  await addSub(db, ana.id, 'https://push.example/ana');
  await addSub(db, budi.id, 'https://push.example/budi');

  const result = await sendTestPush(db, ana.id);

  expect(result).toEqual({ devices: 1, sent: 1, failed: 0 });
  expect(sendNotification).toHaveBeenCalledTimes(1);
  expect(sendNotification).toHaveBeenCalledWith(
    expect.objectContaining({ endpoint: 'https://push.example/ana' }),
    expect.any(String)
  );
});
