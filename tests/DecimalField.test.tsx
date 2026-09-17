import { fireEvent, render } from '@testing-library/react';
import { DecimalField } from '@/components/DecimalField';

function renderInForm(defaultValue?: string) {
  const utils = render(
    <form>
      <DecimalField name="distanceKm" label="Distance (km)" defaultValue={defaultValue} />
    </form>
  );
  return {
    ...utils,
    form: utils.container.querySelector('form')!,
    input: utils.container.querySelector('input')!,
  };
}

test('renders the label', () => {
  const { getByText } = renderInForm();
  expect(getByText('Distance (km)')).toBeInTheDocument();
});

// The whole reason this is not a NumberField: a native number input silently
// discards a comma on a comma-decimal keypad, and the server receives ''.
test('keeps a comma-separated distance so FormData carries the value', () => {
  const { form, input } = renderInForm();
  fireEvent.change(input, { target: { value: '5,25' } });
  expect(input.value).toBe('5,25');
  expect(new FormData(form).get('distanceKm')).toBe('5,25');
});

test('accepts two decimal places, the precision a watch reports', () => {
  const { form, input } = renderInForm();
  fireEvent.change(input, { target: { value: '12.34' } });
  expect(new FormData(form).get('distanceKm')).toBe('12.34');
});

test('caps the fraction at two places as they are typed', () => {
  const { input } = renderInForm();
  fireEvent.change(input, { target: { value: '12.3456' } });
  expect(input.value).toBe('12.34');
});

test('is a text input with a decimal keypad, not a number input', () => {
  const { input } = renderInForm();
  expect(input.type).toBe('text');
  expect(input.inputMode).toBe('decimal');
});

test('prefills an existing distance', () => {
  const { form } = renderInForm('12.3');
  expect(new FormData(form).get('distanceKm')).toBe('12.3');
});
