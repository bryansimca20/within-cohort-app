import { splitLocalDate, shortDate } from '@/lib/dayLabel';

test('splits a local date into day number and weekday', () => {
  expect(splitLocalDate('2026-08-05')).toEqual({ dayNum: '5', weekday: 'Wed' });
});

// 'YYYY-MM-DD' is a plain calendar date with no time component. Parsing and
// formatting stay pinned to UTC, or a negative-offset server timezone rolls
// the displayed day back by one.
test('does not roll the date back in a negative-offset timezone', () => {
  const original = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    expect(splitLocalDate('2026-08-01').dayNum).toBe('1');
  } finally {
    process.env.TZ = original;
  }
});

// --- shortDate -----------------------------------------------------------
// The compact label for a screen header or section heading, where the full
// weekday-and-year date is too long to sit in uppercase type.

test('formats a short month and day label', () => {
  expect(shortDate('2026-09-17')).toBe('Sep 17');
});

test('shortDate does not roll the date back in a negative-offset timezone', () => {
  const original = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    expect(shortDate('2026-08-01')).toBe('Aug 1');
  } finally {
    process.env.TZ = original;
  }
});
