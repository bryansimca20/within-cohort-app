import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { hashPasscode } from '@/lib/passcode';
import { authenticate, attemptLogin } from '@/app/login/actions';
import { rateLimit } from '@/lib/rateLimit';

test('authenticate returns memberId for correct passcode', async () => {
  const { db } = await makeTestDb();
  const hash = await hashPasscode('1234');
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: hash, inCohort: true, isAdmin: false }).returning();
  expect(await authenticate(db, m.id, ' 1234 ')).toBe(m.id);
  expect(await authenticate(db, m.id, 'wrong')).toBeNull();
});

// attemptLogin is the pure core `loginAttempt` delegates to, so — unlike
// `loginAttempt` itself, which hardcodes the prod db handle and is therefore
// disconnected from the pglite test db — it can be driven directly against a
// seeded member. The cookie-writing part of `loginAttempt` (`s.memberId =
// res.memberId; await s.save()`), which needs a real request-scoped cookie
// store, remains build/type-verified only.
test('attemptLogin returns { error: "wrong" } for a bad passcode against a seeded member', async () => {
  const { db } = await makeTestDb();
  const hash = await hashPasscode('1234');
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: hash, inCohort: true, isAdmin: false }).returning();
  expect(await attemptLogin(db, m.id, 'wrong')).toEqual({ error: 'wrong' });
});

test('attemptLogin returns { ok: true, memberId } for a correct passcode against a seeded member', async () => {
  const { db } = await makeTestDb();
  const hash = await hashPasscode('1234');
  const [m] = await db.insert(members).values({ name: 'Ana', passcodeHash: hash, inCohort: true, isAdmin: false }).returning();
  expect(await attemptLogin(db, m.id, '1234')).toEqual({ ok: true, memberId: m.id });
});

test('attemptLogin returns { error: "wrong" } for a non-UUID memberId without touching the db', async () => {
  const { db } = await makeTestDb();
  expect(await attemptLogin(db, 'not-a-uuid', '1234')).toEqual({ error: 'wrong' });
});

test('attemptLogin returns { error: "rate" } once the memberId bucket is exhausted', async () => {
  const { db } = await makeTestDb();
  const memberId = '11111111-1111-1111-1111-111111111111';
  for (let i = 0; i < 10; i++) rateLimit(memberId);

  expect(await attemptLogin(db, memberId, '1234')).toEqual({ error: 'rate' });
});
