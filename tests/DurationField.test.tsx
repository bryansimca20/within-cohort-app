import { fireEvent, render } from '@testing-library/react';
import { DurationField } from '@/components/DurationField';

test('renders the label', () => {
  const { getByText } = render(<DurationField name="sleep" label="Sleep (h:mm)" />);
  expect(getByText('Sleep (h:mm)')).toBeInTheDocument();
});

test('submits the default duration under the given name via FormData', () => {
  const { container } = render(
    <form>
      <DurationField name="sleep" label="Sleep (h:mm)" defaultValue="7:30" />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sleep')).toBe('7:30');
});

test('inserts the colon as digits are typed, so FormData carries a parseable duration', () => {
  const { container } = render(
    <form>
      <DurationField name="sleep" label="Sleep (h:mm)" />
    </form>
  );
  const form = container.querySelector('form')!;
  const input = container.querySelector('input')!;
  fireEvent.change(input, { target: { value: '607' } });
  expect(input.value).toBe('6:07');
  expect(new FormData(form).get('sleep')).toBe('6:07');
});

test('submits an empty string when nothing is typed', () => {
  const { container } = render(
    <form>
      <DurationField name="sleep" label="Sleep (h:mm)" />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sleep')).toBe('');
});
