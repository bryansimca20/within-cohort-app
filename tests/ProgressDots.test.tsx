import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ProgressDots } from '@/components/onboarding/ProgressDots';

test('marks exactly the current dot active and reports position via aria', () => {
  render(<ProgressDots total={4} current={2} />);
  const dots = screen.getAllByTestId('progress-dot');
  expect(dots).toHaveLength(4);
  expect(dots.filter((d) => d.getAttribute('data-active') === 'true')).toHaveLength(1);
  expect(dots[2].getAttribute('data-active')).toBe('true');
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3');
});
