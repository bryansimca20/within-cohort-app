import { render } from '@testing-library/react';
import { NumberField } from '@/components/NumberField';

test('renders the label', () => {
  const { getByText } = render(
    <NumberField name="recovery" label="Recovery score (0-100)" min={0} max={100} step={1} defaultValue={70} />
  );
  expect(getByText('Recovery score (0-100)')).toBeInTheDocument();
});

test('submits the default integer value under the given name via FormData', () => {
  const { container } = render(
    <form>
      <NumberField name="recovery" label="Recovery score (0-100)" min={0} max={100} step={1} defaultValue={70} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('recovery')).toBe('70');
});

test('submits a decimal default value under a different field name', () => {
  const { container } = render(
    <form>
      <NumberField name="sleepHours" label="Sleep (hours)" min={0} max={16} step={0.1} defaultValue={7.5} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sleepHours')).toBe('7.5');
  expect(new FormData(form).get('recovery')).toBeNull();
});

test('the field name is present in FormData even with no defaultValue', () => {
  const { container } = render(
    <form>
      <NumberField name="durationMin" label="Duration (minutes)" min={1} max={600} step={1} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('durationMin')).toBe('');
});
