import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServingToggleField } from '@/components/ServingToggleField';

test('shows an explicit No/Yes readout that tracks the switch', async () => {
  const user = userEvent.setup();
  const { getByRole, getByText, queryByText } = render(<ServingToggleField name="tookServing" />);

  expect(getByText('No')).toBeTruthy();
  expect(queryByText('Yes')).toBeNull();

  await user.click(getByRole('switch'));

  expect(getByText('Yes')).toBeTruthy();
  expect(queryByText('No')).toBeNull();
});

test('starts from defaultChecked and still submits under the given name', async () => {
  const user = userEvent.setup();
  const { container, getByRole, getByText } = render(
    <form>
      <ServingToggleField name="tookServing" defaultChecked />
    </form>
  );
  const form = container.querySelector('form')!;

  expect(getByText('Yes')).toBeTruthy();
  expect(['true', 'on'].includes(String(new FormData(form).get('tookServing')))).toBe(true);

  await user.click(getByRole('switch'));

  expect(getByText('No')).toBeTruthy();
  expect(new FormData(form).get('tookServing')).toBeFalsy();
});
