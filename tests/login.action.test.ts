import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { hashPasscode } from '@/lib/passcode';
import { authenticate } from '@/app/login/actions';

test('authenticate returns memberId for correct passcode', async () => {
  const { db } = await makeTestDb();
  const hash = await hashPasscode('RUN-1234');
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: hash, inCohort: true, isAdmin: false }).returning();
  expect(await authenticate(db, m.id, 'run-1234')).toBe(m.id);
  expect(await authenticate(db, m.id, 'wrong')).toBeNull();
});
