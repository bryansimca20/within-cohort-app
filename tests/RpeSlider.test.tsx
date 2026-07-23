import { render, screen } from '@testing-library/react';
import { RpeSlider } from '@/components/RpeSlider';

test('renders a 0..10 range slider', () => {
  render(<RpeSlider name="rpe" defaultValue={5} />);
  const slider = screen.getByRole('slider') as HTMLInputElement;
  expect(slider.getAttribute('min')).toBe('0');
  expect(slider.getAttribute('max')).toBe('10');
});

test('submits under the given name and reflects the default value', () => {
  render(<RpeSlider name="rpe" defaultValue={7} />);
  const slider = screen.getByRole('slider') as HTMLInputElement;
  expect(slider.name).toBe('rpe');
  expect(slider.value).toBe('7');
});

test('shows a live value readout', () => {
  render(<RpeSlider name="rpe" defaultValue={6} />);
  expect(screen.getByText('6')).toBeInTheDocument();
});

test('shows a min/max legend', () => {
  render(<RpeSlider name="rpe" defaultValue={5} />);
  expect(screen.getByText(/rest/i)).toBeInTheDocument();
  expect(screen.getByText(/max/i)).toBeInTheDocument();
});
