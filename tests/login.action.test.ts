import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { hashPasscode } from '@/lib/passcode';
import { authenticate, loginAttempt } from '@/app/login/actions';
import { rateLimit } from '@/lib/rateLimit';

test('authenticate returns memberId for correct passcode', async () => {
  const { db } = await makeTestDb();
  const hash = await hashPasscode('1234');
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: hash, inCohort: true, isAdmin: false }).returning();
  expect(await authenticate(db, m.id, ' 1234 ')).toBe(m.id);
  expect(await authenticate(db, m.id, 'wrong')).toBeNull();
});

// loginAttempt hardcodes the prod db handle (matching `login`), so only the
// branches that resolve before any db access are exercised here; the
// authenticate-backed `{ error: 'wrong' }` case is covered by the
// `authenticate` test above, and the cookie-writing `{ ok: true }` path
// (which needs a real request-scoped cookie store) is build/type-verified.
test('loginAttempt returns { error: "wrong" } for a missing memberId', async () => {
  const fd = new FormData();
  fd.set('passcode', '1234');
  expect(await loginAttempt(null, fd)).toEqual({ error: 'wrong' });
});

test('loginAttempt returns { error: "wrong" } for a non-UUID memberId', async () => {
  const fd = new FormData();
  fd.set('memberId', 'not-a-uuid');
  fd.set('passcode', '1234');
  expect(await loginAttempt(null, fd)).toEqual({ error: 'wrong' });
});

test('loginAttempt returns { error: "rate" } once the memberId bucket is exhausted', async () => {
  const memberId = '11111111-1111-1111-1111-111111111111';
  for (let i = 0; i < 10; i++) rateLimit(memberId);

  const fd = new FormData();
  fd.set('memberId', memberId);
  fd.set('passcode', '1234');
  expect(await loginAttempt(null, fd)).toEqual({ error: 'rate' });
});
