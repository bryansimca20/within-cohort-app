import { render, screen } from '@testing-library/react';
import { HooperSlider } from '@/components/HooperSlider';

test('renders label and 1..5 with a hidden input name', () => {
  render(<HooperSlider name="hooperSleep" label="Sleep" defaultValue={3} />);
  expect(screen.getByText('Sleep')).toBeInTheDocument();
  expect((screen.getByRole('slider') as HTMLInputElement).getAttribute('min')).toBe('1');
  expect((screen.getByRole('slider') as HTMLInputElement).getAttribute('max')).toBe('5');
});

test('submits under the given name and reflects the default value', () => {
  render(<HooperSlider name="hooperFatigue" label="Fatigue" defaultValue={4} />);
  const slider = screen.getByRole('slider') as HTMLInputElement;
  expect(slider.name).toBe('hooperFatigue');
  expect(slider.value).toBe('4');
});

test('shows a min/max legend', () => {
  render(<HooperSlider name="hooperStress" label="Stress" defaultValue={2} />);
  expect(screen.getByText(/low/i)).toBeInTheDocument();
  expect(screen.getByText(/high/i)).toBeInTheDocument();
});
