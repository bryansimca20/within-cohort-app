import { makeTestDb } from './helpers/testDb';
import { getCohortStartDate, getCohortStartDateOrNull, setCohortStartDate } from '@/lib/cohort';

const ENV_KEY = 'COHORT_START_DATE';

/** Run `fn` with COHORT_START_DATE forced to `value` (or unset when null), restoring it after. */
async function withEnv(value: string | null, fn: () => Promise<void>) {
  const prev = process.env[ENV_KEY];
  if (value === null) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
}

test('setCohortStartDate then getCohortStartDate round-trips the value', async () => {
  const { db } = await makeTestDb();
  await setCohortStartDate(db, '2026-08-01');
  expect(await getCohortStartDate(db)).toBe('2026-08-01');
});

test('setCohortStartDate upserts the singleton row (second write wins)', async () => {
  const { db } = await makeTestDb();
  await setCohortStartDate(db, '2026-08-01');
  await setCohortStartDate(db, '2026-09-15');
  expect(await getCohortStartDate(db)).toBe('2026-09-15');
});

test('setCohortStartDate rejects anything that is not YYYY-MM-DD', async () => {
  const { db } = await makeTestDb();
  await expect(setCohortStartDate(db, '2026/08/01')).rejects.toThrow();
  await expect(setCohortStartDate(db, 'nope')).rejects.toThrow();
  await expect(setCohortStartDate(db, '')).rejects.toThrow();
});

test('a stored config date wins over the env fallback', async () => {
  const { db } = await makeTestDb();
  await withEnv('2026-07-01', async () => {
    await setCohortStartDate(db, '2026-08-20');
    expect(await getCohortStartDate(db)).toBe('2026-08-20');
  });
});

test('falls back to the env var when no config row is set', async () => {
  const { db } = await makeTestDb();
  await withEnv('2026-07-01', async () => {
    expect(await getCohortStartDateOrNull(db)).toBe('2026-07-01');
    expect(await getCohortStartDate(db)).toBe('2026-07-01');
  });
});

test('OrNull is null and getCohortStartDate throws when neither DB nor env is set', async () => {
  const { db } = await makeTestDb();
  await withEnv(null, async () => {
    expect(await getCohortStartDateOrNull(db)).toBeNull();
    await expect(getCohortStartDate(db)).rejects.toThrow();
  });
});
