import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LoginFlow } from '@/components/LoginFlow';
import type { LoginState } from '@/app/login/actions';

// Hoisted so the mock factories below (which vitest hoists above the
// imports) can reference the same fn instances the tests configure per-case.
const { loginAttemptMock, replaceMock } = vi.hoisted(() => ({
  loginAttemptMock: vi.fn(),
  replaceMock: vi.fn(),
}));

// The real `loginAttempt` server action talks to the prod db handle and
// takes a real network round trip. Replaced with a mock so these tests never
// make one; individual tests configure its resolved value to drive the
// wrong-attempt/success transitions without a real server round-trip.
vi.mock('@/app/login/actions', () => ({
  loginAttempt: loginAttemptMock,
}));

// LoginFlow calls useRouter() for the post-login redirect; jsdom has no App
// Router context to read it from, so it's stubbed like the action above.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

// Resolver for the default (step/digit-only) mock below. Captured so
// `afterEach` can settle it — see the comment on `beforeEach` for why an
// actually-never-resolving promise is unsafe across tests.
let settleDefaultDispatch: ((value: LoginState) => void) | null = null;

beforeEach(() => {
  replaceMock.mockReset();
  // Default: resolves only once explicitly settled in `afterEach`. Tests
  // that don't care about the server round-trip's outcome (they assert
  // synchronously right after typing digits) get an in-flight promise that
  // never resolves *during* the test, keeping them deterministic. Leaving it
  // truly unresolved forever, though, stalls React's action-state machinery
  // for the *next* test that does `await` on a resolution (confirmed by
  // reproduction: a later test's `findByText` timed out only when a prior
  // test's dispatch was left permanently pending) — so it's explicitly
  // settled once this test is done, before the next `beforeEach` runs.
  loginAttemptMock.mockReset();
  loginAttemptMock.mockImplementation(
    () =>
      new Promise<LoginState>((resolve) => {
        settleDefaultDispatch = resolve;
      })
  );
});

afterEach(() => {
  settleDefaultDispatch?.(null);
  settleDefaultDispatch = null;
  cleanup();
});

const roster = [
  { id: 'member-1', name: 'Ana Wijaya' },
  { id: 'member-2', name: 'Budi Santoso' },
];

test('picking a roster member advances to the passcode step', async () => {
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  expect(screen.queryByText('Enter passcode')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Ana Wijaya/i }));
  expect(screen.getByText('Enter passcode')).toBeInTheDocument();
});

test('pressing four keypad digits fills all four dots', async () => {
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  await user.click(screen.getByRole('button', { name: /Ana Wijaya/i }));
  for (const digit of ['1', '2', '3', '4']) {
    await user.click(screen.getByRole('button', { name: digit }));
  }

  const dots = screen.getAllByTestId('dot');
  expect(dots).toHaveLength(4);
  expect(dots.filter((dot) => dot.getAttribute('data-filled') === 'true')).toHaveLength(4);
});

test('starts each passcode step with zero dots filled', async () => {
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  await user.click(screen.getByRole('button', { name: /Budi Santoso/i }));
  const dots = screen.getAllByTestId('dot');
  expect(dots.filter((dot) => dot.getAttribute('data-filled') === 'true')).toHaveLength(0);
});

test('a wrong passcode clears the dots, shows the error, and keeps the selected member on the code step', async () => {
  loginAttemptMock.mockResolvedValueOnce({ error: 'wrong' });
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  await user.click(screen.getByRole('button', { name: /Ana Wijaya/i }));
  for (const digit of ['1', '2', '3', '4']) {
    await user.click(screen.getByRole('button', { name: digit }));
  }

  await screen.findByText('Wrong passcode.');

  const dots = screen.getAllByTestId('dot');
  expect(dots.filter((dot) => dot.getAttribute('data-filled') === 'true')).toHaveLength(0);

  // Still on the code step for the same member — a wrong attempt must not
  // bounce the runner back to the "who" step or lose the selection.
  expect(screen.getByText('Ana Wijaya')).toBeInTheDocument();
  expect(screen.getByText('Enter passcode')).toBeInTheDocument();

  expect(loginAttemptMock).toHaveBeenCalledTimes(1);
  const submittedFormData = loginAttemptMock.mock.calls[0]?.[1] as FormData;
  expect(submittedFormData.get('memberId')).toBe(roster[0].id);
  expect(submittedFormData.get('passcode')).toBe('1234');
});

test('an onboarded member navigates to /today', async () => {
  loginAttemptMock.mockResolvedValueOnce({ ok: true, onboarded: true });
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  await user.click(screen.getByRole('button', { name: /Budi Santoso/i }));
  for (const digit of ['5', '6', '7', '8']) {
    await user.click(screen.getByRole('button', { name: digit }));
  }

  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/today'));
});

test('a first-time login navigates to /welcome', async () => {
  loginAttemptMock.mockResolvedValueOnce({ ok: true, onboarded: false });
  const user = userEvent.setup();
  render(<LoginFlow roster={roster} />);

  await user.click(screen.getByRole('button', { name: /Ana Wijaya/i }));
  for (const digit of ['1', '2', '3', '4']) {
    await user.click(screen.getByRole('button', { name: digit }));
  }

  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/welcome'));
});
