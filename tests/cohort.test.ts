import { makeTestDb } from './helpers/testDb';
import { getCohortStartDate, getCohortStartDateOrNull, setCohortStartDate } from '@/lib/cohort';

test('setCohortStartDate then getCohortStartDate round-trips the value', async () => {
  const { db } = await makeTestDb();
  await setCohortStartDate(db, '2026-08-01');
  expect(await getCohortStartDate(db)).toBe('2026-08-01');
  expect(await getCohortStartDateOrNull(db)).toBe('2026-08-01');
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

test('getCohortStartDateOrNull is null when the config row is unset', async () => {
  const { db } = await makeTestDb();
  expect(await getCohortStartDateOrNull(db)).toBeNull();
});

test('getCohortStartDate throws when the config row is unset', async () => {
  const { db } = await makeTestDb();
  await expect(getCohortStartDate(db)).rejects.toThrow();
});
