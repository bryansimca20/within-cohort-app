import { render } from '@testing-library/react';
import { HooperSlider } from '@/components/HooperSlider';

test('renders label, live readout, and low/high legend', () => {
  const { getByText } = render(<HooperSlider name="hooperSleep" label="Sleep" defaultValue={3} />);
  expect(getByText('Sleep')).toBeInTheDocument();
  expect(getByText('3')).toBeInTheDocument();
  expect(getByText('1 low')).toBeInTheDocument();
  expect(getByText('5 high')).toBeInTheDocument();
});

test('submits the default value under the given name via FormData', () => {
  const { container } = render(
    <form>
      <HooperSlider name="hooperSleep" label="Sleep" defaultValue={3} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('hooperSleep')).toBe('3');
});

test('submits a different default value under a different field name', () => {
  const { container } = render(
    <form>
      <HooperSlider name="hooperFatigue" label="Fatigue" defaultValue={4} />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('hooperFatigue')).toBe('4');
  expect(new FormData(form).get('hooperSleep')).toBeNull();
});

test('falls back to the default of 3 when no defaultValue is given', () => {
  const { container } = render(
    <form>
      <HooperSlider name="hooperStress" label="Stress" />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('hooperStress')).toBe('3');
});
