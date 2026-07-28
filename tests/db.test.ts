import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';

test('inserts and reads a member', async () => {
  const { db } = await makeTestDb();
  await db.insert(members).values({
    name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false,
  });
  const rows = await db.select().from(members);
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe('Ana');
});
