import { eq } from 'drizzle-orm';
import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { hashPasscode } from '@/lib/passcode';
import { markOnboarded } from '@/app/welcome/actions';

test('a freshly inserted member has a null onboardedAt', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: await hashPasscode('1234'), inCohort: true })
    .returning();
  expect(m.onboardedAt).toBeNull();
});

test('markOnboarded stamps onboardedAt when it is null', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: await hashPasscode('1234'), inCohort: true })
    .returning();
  const now = new Date('2026-08-04T01:00:00.000Z');
  await markOnboarded(db, m.id, now);
  const [after] = await db.select().from(members).where(eq(members.id, m.id));
  expect(after.onboardedAt?.toISOString()).toBe(now.toISOString());
});

test('markOnboarded is idempotent: a second call keeps the first stamp', async () => {
  const { db } = await makeTestDb();
  const [m] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: await hashPasscode('1234'), inCohort: true })
    .returning();
  const first = new Date('2026-08-04T01:00:00.000Z');
  const second = new Date('2026-08-05T09:00:00.000Z');
  await markOnboarded(db, m.id, first);
  await markOnboarded(db, m.id, second);
  const [after] = await db.select().from(members).where(eq(members.id, m.id));
  expect(after.onboardedAt?.toISOString()).toBe(first.toISOString());
});
