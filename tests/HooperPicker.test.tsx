import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HooperPicker } from '@/components/HooperPicker';

test('hidden input carries the default then the tapped value', async () => {
  const { container } = render(<HooperPicker name="hooperSleep" label="Sleep quality" defaultValue={3} />);
  const hidden = () => container.querySelector('input[name="hooperSleep"]') as HTMLInputElement;
  expect(hidden().value).toBe('3');
  await userEvent.click(screen.getByRole('button', { name: '5' }));
  expect(hidden().value).toBe('5');
});

test('Hooper pills keep the full 52px size', () => {
  render(<HooperPicker name="hooperStress" label="Stress" defaultValue={3} />);
  expect(screen.getByRole('button', { name: '3' }).className).toContain('h-[52px]');
});
