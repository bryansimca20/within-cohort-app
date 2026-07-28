import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/components/ui/switch';

test('toggling on submits an accepted truthy value under the given name via FormData', async () => {
  const user = userEvent.setup();
  const { container, getByRole } = render(
    <form>
      <Switch name="tookServing" />
    </form>
  );
  const form = container.querySelector('form')!;
  const control = getByRole('switch');

  await user.click(control);

  const fd = new FormData(form);
  expect(['true', 'on'].includes(String(fd.get('tookServing')))).toBe(true);
});

test('toggling off leaves the field absent/falsy in FormData', async () => {
  const user = userEvent.setup();
  const { container, getByRole } = render(
    <form>
      <Switch name="tookServing" defaultChecked />
    </form>
  );
  const form = container.querySelector('form')!;
  const control = getByRole('switch');

  await user.click(control);

  const fd = new FormData(form);
  expect(fd.get('tookServing')).toBeFalsy();
});
