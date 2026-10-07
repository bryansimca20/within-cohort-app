import { fireEvent, render, screen } from '@testing-library/react';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import type { ActivityDay, MemberActivity } from '@/lib/activity';
import type { CheckinRow, SessionRow } from '@/lib/history';

const STAMP = new Date('2026-08-15T02:00:00Z');

function checkin(localDate: string, recovery: number): CheckinRow {
  return {
    id: `c-${localDate}`,
    memberId: 'm1',
    localDate,
    phase: 'within',
    recovery,
    restingHr: 48,
    hrvMs: null,
    sleepMinutes: 450,
    hooperSleep: 3,
    hooperFatigue: 2,
    hooperSoreness: 2,
    hooperStress: 1,
    note: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function session(id: string, localDate: string, servings: number): SessionRow {
  return {
    id,
    memberId: 'm1',
    localDate,
    phase: 'within',
    sessionType: 'tempo',
    sessionTypeOther: null,
    rpe: 7,
    durationMin: 45,
    distanceKm: '8.50',
    servings,
    note: null,
    createdAt: STAMP,
  };
}

// Three elapsed Within days: a full day, a missed day, and a check-in only day.
const days: ActivityDay[] = [
  {
    localDate: '2026-08-15',
    phase: 'within',
    checkin: checkin('2026-08-15', 72),
    sessions: [session('s1', '2026-08-15', 1), session('s2', '2026-08-15', 2)],
    logged: true,
    servings: 3,
  },
  { localDate: '2026-08-16', phase: 'within', checkin: null, sessions: [], logged: false, servings: null },
  { localDate: '2026-08-17', phase: 'within', checkin: checkin('2026-08-17', 64), sessions: [], logged: true, servings: null },
];

const member: MemberActivity = {
  id: 'm1',
  name: 'Ana',
  days,
  checkinCount: 2,
  lastCheckinDate: '2026-08-17',
  daysQuiet: 0,
  checkedInToday: true,
};

const renderCalendar = (overrides: Partial<MemberActivity> = {}) =>
  render(<ActivityCalendar member={{ ...member, ...overrides }} startDate="2026-08-15" totalDays={7} />);

const dayButton = (name: RegExp) => screen.getByRole('button', { name });

test('each elapsed day says what was logged on it', () => {
  renderCalendar();

  expect(dayButton(/Aug 15/)).toHaveAccessibleName('Sat, Aug 15, 2026: checked in, 2 sessions, 3 servings');
  expect(dayButton(/Aug 16/)).toHaveAccessibleName('Sun, Aug 16, 2026: no check-in, no sessions');
  expect(dayButton(/Aug 17/)).toHaveAccessibleName('Mon, Aug 17, 2026: checked in, no sessions');
});

test('days that have not happened yet cannot be opened', () => {
  renderCalendar();

  // 7 protocol days, 3 elapsed: only those 3 are buttons.
  expect(screen.getAllByRole('button')).toHaveLength(3);
});

test('tapping a day shows what was logged, and tapping it again hides it', () => {
  renderCalendar();
  expect(screen.queryByText(/Recovery 72/)).not.toBeInTheDocument();

  fireEvent.click(dayButton(/Aug 15/));
  expect(screen.getByText(/Recovery 72/)).toBeInTheDocument();
  expect(screen.getAllByText(/Tempo · RPE 7 · 45 min · 8.5 km/)).toHaveLength(2);
  expect(dayButton(/Aug 15/)).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(dayButton(/Aug 15/));
  expect(screen.queryByText(/Recovery 72/)).not.toBeInTheDocument();
  expect(dayButton(/Aug 15/)).toHaveAttribute('aria-pressed', 'false');
});

test('tapping another day switches the detail to it', () => {
  renderCalendar();

  fireEvent.click(dayButton(/Aug 15/));
  fireEvent.click(dayButton(/Aug 17/));

  expect(screen.queryByText(/Recovery 72/)).not.toBeInTheDocument();
  expect(screen.getByText(/Recovery 64/)).toBeInTheDocument();
});

test('a missed day opens to say nothing was logged', () => {
  renderCalendar();

  fireEvent.click(dayButton(/Aug 16/));

  expect(screen.getByText('Not logged')).toBeInTheDocument();
});

test('hovering with a mouse previews a day and leaving restores the tapped one', () => {
  renderCalendar();
  fireEvent.click(dayButton(/Aug 17/));

  fireEvent.pointerEnter(dayButton(/Aug 15/), { pointerType: 'mouse' });
  expect(screen.getByText(/Recovery 72/)).toBeInTheDocument();

  fireEvent.pointerLeave(dayButton(/Aug 15/), { pointerType: 'mouse' });
  expect(screen.queryByText(/Recovery 72/)).not.toBeInTheDocument();
  expect(screen.getByText(/Recovery 64/)).toBeInTheDocument();
});

test('a touch does not leave a hover preview stuck open', () => {
  renderCalendar();

  // A tap fires pointerenter with no matching leave. If that counted as a
  // hover, the second tap could never close the detail.
  fireEvent.pointerEnter(dayButton(/Aug 15/), { pointerType: 'touch' });
  fireEvent.click(dayButton(/Aug 15/));
  fireEvent.click(dayButton(/Aug 15/));

  expect(screen.queryByText(/Recovery 72/)).not.toBeInTheDocument();
});

test('the header counts check-ins against elapsed days and links to the member', () => {
  renderCalendar();

  expect(screen.getByText('Check-ins 2 / 3')).toBeInTheDocument();
  expect(screen.getByText('Last check-in today')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ana/ })).toHaveAttribute('href', '/admin/member/m1');
});

test('the header says how long a quiet member has gone without a check-in', () => {
  renderCalendar({ daysQuiet: 2, lastCheckinDate: '2026-08-15', checkedInToday: false });
  expect(screen.getByText('Last check-in 2 days ago')).toBeInTheDocument();
});

test('the header says so when a member has never checked in', () => {
  renderCalendar({ daysQuiet: 3, lastCheckinDate: null, checkinCount: 0, checkedInToday: false });
  expect(screen.getByText('No check-ins yet')).toBeInTheDocument();
});
