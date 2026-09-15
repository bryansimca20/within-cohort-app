import { groupByDate, servingsLabel, type CheckinRow, type SessionRow } from '@/lib/history';

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
