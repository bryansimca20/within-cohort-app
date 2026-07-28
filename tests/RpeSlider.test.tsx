import { render } from '@testing-library/react';
import { RpeSlider } from '@/components/RpeSlider';

test('renders the RPE label, live readout, and rest/max legend', () => {
  const { getByText } = render(<RpeSlider name="rpe" defaultValue={6} />);
  expect(getByText('RPE · effort')).toBeInTheDocument();
  expect(getByText('6')).toBeInTheDocument();
  expect(getByText('0 · rest')).toBeInTheDocument();
  expect(getByText('10 · max')).toBeInTheDocument();
});

test('submits the default value under the given name via FormData', () => {
  const { container } = render(
    <form>
      <RpeSlider name="rpe" defaultValue={7} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('rpe')).toBe('7');
});

test('falls back to the default of 5 when no defaultValue is given', () => {
  const { container } = render(
    <form>
      <RpeSlider name="rpe" />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('rpe')).toBe('5');
});
