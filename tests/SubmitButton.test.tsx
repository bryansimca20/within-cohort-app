import { act, render, screen, waitFor } from '@testing-library/react';
import { BareSubmitButton, SubmitButton } from '@/components/SubmitButton';

/** A form action that stays in flight until the returned `finish` is called. */
function deferredAction() {
  let finish!: () => void;
  const action = () =>
    new Promise<void>((resolve) => {
      finish = resolve;
    });
  return { action, finish: () => finish() };
}

test('SubmitButton disables itself and shows the pending label while the action is in flight', async () => {
  const { action, finish } = deferredAction();
  render(
    <form action={action}>
      <SubmitButton pendingLabel="Saving">Log session</SubmitButton>
    </form>
  );

  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('Log session');

  await act(async () => {
    button.click();
  });

  // This is the double-log fix: the second tap of an impatient double tap
  // lands on a disabled control instead of posting a second session_logs row.
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveTextContent('Saving');

  await act(async () => {
    finish();
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  expect(button).toHaveTextContent('Log session');
});

test('SubmitButton falls back to its idle label when no pendingLabel is given', async () => {
  const { action, finish } = deferredAction();
  render(
    <form action={action}>
      <SubmitButton>Save</SubmitButton>
    </form>
  );

  const button = screen.getByRole('button');
  await act(async () => {
    button.click();
  });
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Save');

  await act(async () => {
    finish();
  });
});

test('BareSubmitButton disables itself and shows the pending label while the action is in flight', async () => {
  const { action, finish } = deferredAction();
  render(
    <form action={action}>
      <BareSubmitButton pendingLabel="Logging out">Log out</BareSubmitButton>
    </form>
  );

  const button = screen.getByRole('button');
  await act(async () => {
    button.click();
  });
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Logging out');

  await act(async () => {
    finish();
  });
  await waitFor(() => expect(button).not.toBeDisabled());
  expect(button).toHaveTextContent('Log out');
});
