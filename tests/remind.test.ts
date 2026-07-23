import { makeTestDb } from './helpers/testDb';
import { members } from '@/db/schema';
import { membersNeedingReminder } from '@/lib/reminders';
import { saveCheckin } from '@/app/(app)/checkin/actions';

const valid = { recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 };

// 2026-08-15T02:00:00Z -> 09:00 Asia/Jakarta -> localDate 2026-08-15
const NOW = new Date('2026-08-15T02:00:00Z');

test('an in-cohort member in the active window with no checkin today is returned', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' });

  const due = await membersNeedingReminder(db, NOW);
  expect(due.map((m) => m.name)).toEqual(['Ana']);
});

test('a member who already checked in today is not returned', async () => {
  const { db } = await makeTestDb();
  const [ana] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' })
    .returning();
  await saveCheckin(db, ana, valid, NOW);

  const due = await membersNeedingReminder(db, NOW);
  expect(due.find((m) => m.name === 'Ana')).toBeUndefined();
});

test('a non-inCohort member is not returned', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Cas', passcodeHash: 'x', inCohort: false, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' });

  const due = await membersNeedingReminder(db, NOW);
  expect(due.find((m) => m.name === 'Cas')).toBeUndefined();
});

test('a member with no cohortStartDate (pre) is not returned', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Deb', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: null, timezone: 'Asia/Jakarta' });

  const due = await membersNeedingReminder(db, NOW);
  expect(due.find((m) => m.name === 'Deb')).toBeUndefined();
});

test('a member past day 41 (complete) is not returned', async () => {
  const { db } = await makeTestDb();
  await db
    .insert(members)
    .values({ name: 'Eli', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: '2026-06-01', timezone: 'Asia/Jakarta' });

  const due = await membersNeedingReminder(db, NOW);
  expect(due.find((m) => m.name === 'Eli')).toBeUndefined();
});

test('returns id, name, and timezone for a due member', async () => {
  const { db } = await makeTestDb();
  const [ana] = await db
    .insert(members)
    .values({ name: 'Ana', passcodeHash: 'x', inCohort: true, isAdmin: false, cohortStartDate: '2026-08-01', timezone: 'Asia/Jakarta' })
    .returning();

  const due = await membersNeedingReminder(db, NOW);
  expect(due).toEqual([{ id: ana.id, name: 'Ana', timezone: 'Asia/Jakarta' }]);
});
