import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { LoginFlow } from '@/components/LoginFlow';

// The real `loginAttempt` server action talks to the prod db handle and
// takes a real network round trip. This test is scoped to the step/digit
// UI, not the server call, so the action is replaced with a stub that never
// resolves — the component never receives a new LoginState during the test,
// keeping dot-fill assertions deterministic regardless of async timing.
vi.mock('@/app/login/actions', () => ({
  loginAttempt: vi.fn(() => new Promise(() => {})),
}));

// LoginFlow calls useRouter() for the post-login redirect; jsdom has no App
// Router context to read it from, so it's stubbed like the action above.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

afterEach(() => {
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
