import { groupByDate, servingsLabel, buildLedger, isLateEntry, type CheckinRow, type SessionRow } from '@/lib/history';

let checkinSeq = 0;
function makeCheckin(overrides: Partial<CheckinRow> & { localDate: string }): CheckinRow {
  checkinSeq += 1;
  return {
    id: `checkin-${checkinSeq}`,
    memberId: 'member-1',
    phase: 'within',
    recovery: 72,
    restingHr: 48,
    hrvMs: null,
    sleepMinutes: 450,
    hooperSleep: 3,
    hooperFatigue: 2,
    hooperSoreness: 2,
    hooperStress: 1,
    note: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

let sessionSeq = 0;
function makeSession(overrides: Partial<SessionRow> & { localDate: string }): SessionRow {
  sessionSeq += 1;
  return {
    id: `session-${sessionSeq}`,
    memberId: 'member-1',
    phase: 'within',
    sessionType: 'easy',
    sessionTypeOther: null,
    rpe: 4,
    durationMin: 30,
    distanceKm: '5.0',
    servings: null,
    note: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

test('a check-in-only day appears with an empty sessions list', () => {
  const checkins = [makeCheckin({ localDate: '2026-08-10' })];
  const sessions: SessionRow[] = [];

  const days = groupByDate(checkins, sessions);

  expect(days).toHaveLength(1);
  expect(days[0].localDate).toBe('2026-08-10');
  expect(days[0].checkin).not.toBeNull();
  expect(days[0].sessions).toEqual([]);
});

test('a session-only day appears with a null checkin', () => {
  const checkins: CheckinRow[] = [];
  const sessions = [makeSession({ localDate: '2026-08-10' })];

  const days = groupByDate(checkins, sessions);

  expect(days).toHaveLength(1);
  expect(days[0].localDate).toBe('2026-08-10');
  expect(days[0].checkin).toBeNull();
  expect(days[0].sessions).toHaveLength(1);
  expect(days[0].sessions[0]).toBe(sessions[0]);
});

test('a combined day merges the checkin with all of its sessions, newest first, dropping nothing', () => {
  const checkins = [
    makeCheckin({ id: 'c-old', localDate: '2026-08-08' }),
    makeCheckin({ id: 'c-new', localDate: '2026-08-10' }),
  ];
  const sessions = [
    makeSession({ id: 's-1', localDate: '2026-08-10', sessionType: 'easy' }),
    makeSession({ id: 's-2', localDate: '2026-08-10', sessionType: 'long' }),
    makeSession({ id: 's-3', localDate: '2026-08-08' }),
  ];

  const days = groupByDate(checkins, sessions);

  // newest first
  expect(days.map((d) => d.localDate)).toEqual(['2026-08-10', '2026-08-08']);

  const newDay = days[0];
  expect(newDay.checkin?.id).toBe('c-new');
  expect(newDay.sessions.map((s) => s.id)).toEqual(['s-1', 's-2']);

  const oldDay = days[1];
  expect(oldDay.checkin?.id).toBe('c-old');
  expect(oldDay.sessions.map((s) => s.id)).toEqual(['s-3']);

  // nothing dropped or duplicated: 2 days total, 2+1 sessions total, 2 checkins total
  expect(days).toHaveLength(2);
  expect(days.reduce((n, d) => n + d.sessions.length, 0)).toBe(3);
  expect(days.filter((d) => d.checkin !== null)).toHaveLength(2);
});

// Readers show a serving count only when there is one: baseline rows are null
// and a within 0 means none taken, and neither is worth a line of text.
test('servingsLabel is empty for a baseline null', () => {
  expect(servingsLabel(null)).toBe('');
});
test('servingsLabel is empty when none were taken', () => {
  expect(servingsLabel(0)).toBe('');
});
test('servingsLabel uses the singular for one serving', () => {
  expect(servingsLabel(1)).toBe('1 serving');
});
test('servingsLabel uses the plural for more than one', () => {
  expect(servingsLabel(3)).toBe('3 servings');
});

// --- buildLedger ---------------------------------------------------------
// History shows every protocol day, logged or not, so a missed morning is a
// row with a CTA rather than an absence the member has to notice.

test('buildLedger returns a row for every day from the cohort start through today, newest first', () => {
  const days = buildLedger('2026-08-01', '2026-08-05', []);

  expect(days.map((d) => d.localDate)).toEqual([
    '2026-08-05',
    '2026-08-04',
    '2026-08-03',
    '2026-08-02',
    '2026-08-01',
  ]);
});

test('buildLedger marks a day with no rows as not logged', () => {
  const days = buildLedger('2026-08-01', '2026-08-02', []);

  expect(days.every((d) => d.logged)).toBe(false);
  expect(days[0].checkin).toBeNull();
  expect(days[0].sessions).toEqual([]);
});

test('buildLedger marks a day with a checkin as logged and carries the row through', () => {
  const checkin = makeCheckin({ id: 'c-1', localDate: '2026-08-02', phase: 'baseline' });
  const groups = groupByDate([checkin], []);

  const days = buildLedger('2026-08-01', '2026-08-03', groups);

  const logged = days.find((d) => d.localDate === '2026-08-02');
  expect(logged?.logged).toBe(true);
  expect(logged?.checkin?.id).toBe('c-1');
});

test('buildLedger marks a session-only day as logged', () => {
  const groups = groupByDate([], [makeSession({ id: 's-1', localDate: '2026-08-02' })]);

  const days = buildLedger('2026-08-01', '2026-08-03', groups);

  expect(days.find((d) => d.localDate === '2026-08-02')?.logged).toBe(true);
});

// An unlogged day has no stamped phase to read, so the ledger derives it from
// the start date. Getting this wrong would label the day a member is about to
// backfill with the wrong phase before they ever open it.
test('buildLedger derives the phase of an unlogged day from the start date', () => {
  const days = buildLedger('2026-08-01', '2026-08-15', []);

  expect(days.find((d) => d.localDate === '2026-08-14')?.phase).toBe('baseline');
  expect(days.find((d) => d.localDate === '2026-08-15')?.phase).toBe('within');
});

test('buildLedger reads the stamped phase of a logged day rather than re-deriving it', () => {
  const checkin = makeCheckin({ localDate: '2026-08-15', phase: 'baseline' });
  const groups = groupByDate([checkin], []);

  const days = buildLedger('2026-08-01', '2026-08-16', groups);

  expect(days.find((d) => d.localDate === '2026-08-15')?.phase).toBe('baseline');
});

// The protocol is 42 days. Once it completes the ledger freezes: no rows for
// days past the window, however long ago the cohort finished.
test('buildLedger stops at the last protocol day once the window is complete', () => {
  const days = buildLedger('2026-08-01', '2026-09-20', []);

  expect(days).toHaveLength(42);
  expect(days[0].localDate).toBe('2026-09-11');
  expect(days[41].localDate).toBe('2026-08-01');
});

test('buildLedger returns a single unlogged row on the cohort first day', () => {
  const days = buildLedger('2026-08-01', '2026-08-01', []);

  expect(days).toHaveLength(1);
  expect(days[0].logged).toBe(false);
});

// --- isLateEntry ---------------------------------------------------------
// Provenance for phase 2: a number recalled five days later is not the same
// evidence as a 7 a.m. reading, and nothing in the row says so on its own.

test('isLateEntry is false for a row written on the day it describes', () => {
  // 02:00 UTC is 09:00 Jakarta on the same date
  expect(isLateEntry('2026-08-01', new Date('2026-08-01T02:00:00Z'))).toBe(false);
});

test('isLateEntry is true for a row written on a later day', () => {
  expect(isLateEntry('2026-08-01', new Date('2026-08-04T02:00:00Z'))).toBe(true);
});

// The comparison has to convert to Jakarta first. 23:30 UTC on the 1st is
// already 06:30 on the 2nd in Jakarta, so a naive UTC comparison would call
// this an on-time entry for the 1st when the member wrote it the next morning.
test('isLateEntry resolves the write instant in Jakarta, not UTC', () => {
  expect(isLateEntry('2026-08-01', new Date('2026-08-01T23:30:00Z'))).toBe(true);
});

test('isLateEntry is false for a row written before midnight Jakarta on its own day', () => {
  // 16:00 UTC is 23:00 Jakarta, still the same date
  expect(isLateEntry('2026-08-01', new Date('2026-08-01T16:00:00Z'))).toBe(false);
});
