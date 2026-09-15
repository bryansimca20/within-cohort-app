import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServingsField } from '@/components/ServingsField';

// Toggle first, count second: "No" stays the obvious one-tap default, and the
// 1-4 row only appears once a member says they took one. Whatever the UI
// state, exactly one `servings` value is submitted.
function renderInForm(defaultValue?: number | null) {
  const utils = render(
    <form>
      <ServingsField name="servings" defaultValue={defaultValue} />
    </form>
  );
  const form = utils.container.querySelector('form')!;
  const submitted = () => new FormData(form).getAll('servings');
  return { ...utils, submitted };
}

test('starts off, shows No, hides the count, and submits 0', () => {
  const { submitted } = renderInForm();
  expect(screen.getByText('No')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '1' })).toBeNull();
  expect(submitted()).toEqual(['0']);
});

test('turning it on shows Yes and the count row, and submits 1', async () => {
  const user = userEvent.setup();
  const { submitted } = renderInForm();
  await user.click(screen.getByRole('switch'));
  expect(screen.getByText('Yes')).toBeTruthy();
  expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-pressed')).toBe('true');
  expect(submitted()).toEqual(['1']);
});

test('tapping a count submits that count', async () => {
  const user = userEvent.setup();
  const { submitted } = renderInForm();
  await user.click(screen.getByRole('switch'));
  await user.click(screen.getByRole('button', { name: '3' }));
  expect(submitted()).toEqual(['3']);
});

test('turning it off submits 0 and hides the row, and turning it back on keeps the count', async () => {
  const user = userEvent.setup();
  const { submitted } = renderInForm();
  await user.click(screen.getByRole('switch'));
  await user.click(screen.getByRole('button', { name: '3' }));
  await user.click(screen.getByRole('switch'));
  expect(submitted()).toEqual(['0']);
  expect(screen.queryByRole('button', { name: '3' })).toBeNull();
  await user.click(screen.getByRole('switch'));
  expect(submitted()).toEqual(['3']);
});

test('a stored count prefills the toggle on with that count selected', () => {
  const { submitted } = renderInForm(2);
  expect(screen.getByText('Yes')).toBeTruthy();
  expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true');
  expect(submitted()).toEqual(['2']);
});

test('a stored 0 or null prefills the toggle off', () => {
  const { submitted, unmount } = renderInForm(0);
  expect(screen.getByText('No')).toBeTruthy();
  expect(submitted()).toEqual(['0']);
  unmount();
  const second = renderInForm(null);
  expect(screen.getByText('No')).toBeTruthy();
  expect(second.submitted()).toEqual(['0']);
});

// The count row sits inside a card on the session form, so it uses the
// compact pill size; the Hooper rows on check-in keep the full 52px size.
test('the count pills use the compact 44px size', async () => {
  const user = userEvent.setup();
  renderInForm();
  await user.click(screen.getByRole('switch'));
  const pill = screen.getByRole('button', { name: '1' });
  expect(pill.className).toContain('h-11');
  expect(pill.className).not.toContain('h-[52px]');
});
