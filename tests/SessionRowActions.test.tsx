import { act, render, screen, waitFor } from '@testing-library/react';
import { SessionRowActions } from '@/components/SessionRowActions';

// The component binds the real server action, which cannot run in jsdom.
// Stubbing it with a deferred promise is what lets the pending state be
// observed: the form stays in flight until `finish` is called.
let finish: () => void = () => {};
vi.mock('@/app/(app)/session/actions', () => ({
  deleteSessionAction: () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
}));

test('delete arms on the first tap and only submits on the second', async () => {
  render(<SessionRowActions sessionId="s1" from="session" />);
  const button = screen.getByRole('button');

  expect(button).toHaveTextContent('Delete');

  await act(async () => {
    button.click();
  });
  expect(button).toHaveTextContent('Confirm delete?');
  expect(button).not.toBeDisabled();
});

test('delete disables and shows a spinner while the action is in flight', async () => {
  render(<SessionRowActions sessionId="s1" from="session" />);
  const button = screen.getByRole('button');

  await act(async () => {
    button.click();
  });
  await act(async () => {
    button.click();
  });

  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveTextContent('Deleting');

  await act(async () => {
    finish();
  });
  await waitFor(() => expect(button).not.toBeDisabled());
});

test('edit links back to the edit route with where it came from', () => {
  render(<SessionRowActions sessionId="s1" from="history" />);
  expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute(
    'href',
    '/session/s1/edit?from=history'
  );
});
