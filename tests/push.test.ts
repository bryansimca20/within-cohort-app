import { makeTestDb } from './helpers/testDb';
import { members, pushSubscriptions } from '@/db/schema';
import { upsertSubscription } from '@/lib/push';

async function makeMember(db: Awaited<ReturnType<typeof makeTestDb>>['db'], name: string) {
  const [member] = await db
    .insert(members)
    .values({
      name,
      passcodeHash: 'x',
      inCohort: true,
      isAdmin: false,
      cohortStartDate: '2026-08-01',
      timezone: 'Asia/Jakarta',
    })
    .returning();
  return member;
}

test('inserting a subscription creates one row with the right member/endpoint/keys', async () => {
  const { db } = await makeTestDb();
  const member = await makeMember(db, 'Ana');

  await upsertSubscription(db, member.id, {
    endpoint: 'https://push.example/ana',
    keys: { p256dh: 'p256dh-ana', auth: 'auth-ana' },
  });

  const rows = await db.select().from(pushSubscriptions);
  expect(rows).toHaveLength(1);
  expect(rows[0].memberId).toBe(member.id);
  expect(rows[0].endpoint).toBe('https://push.example/ana');
  expect(rows[0].p256dh).toBe('p256dh-ana');
  expect(rows[0].auth).toBe('auth-ana');
});

test('re-subscribing the same endpoint for a different member results in one row, re-assigned', async () => {
  const { db } = await makeTestDb();
  const ana = await makeMember(db, 'Ana');
  const budi = await makeMember(db, 'Budi');

  await upsertSubscription(db, ana.id, {
    endpoint: 'https://push.example/shared-device',
    keys: { p256dh: 'p256dh-1', auth: 'auth-1' },
  });
  await upsertSubscription(db, budi.id, {
    endpoint: 'https://push.example/shared-device',
    keys: { p256dh: 'p256dh-2', auth: 'auth-2' },
  });

  const rows = await db.select().from(pushSubscriptions);
  expect(rows).toHaveLength(1);
  expect(rows[0].memberId).toBe(budi.id);
  expect(rows[0].endpoint).toBe('https://push.example/shared-device');
  expect(rows[0].p256dh).toBe('p256dh-2');
  expect(rows[0].auth).toBe('auth-2');
});
