import { assertLoggableDate } from '@/lib/logDate';

const START = '2026-08-01';
// 2026-08-20 09:00 Jakarta, day 19 of the protocol (within)
const NOW = new Date('2026-08-20T02:00:00Z');

test('accepts today and reports its phase', () => {
  expect(assertLoggableDate('2026-08-20', NOW, START, 'check-ins')).toEqual({
    localDate: '2026-08-20',
    phase: 'within',
  });
});

test('accepts an earlier protocol day and reports that day\'s phase', () => {
  expect(assertLoggableDate('2026-08-05', NOW, START, 'check-ins')).toEqual({
    localDate: '2026-08-05',
    phase: 'baseline',
  });
});

test('accepts the cohort start date itself', () => {
  expect(assertLoggableDate(START, NOW, START, 'check-ins').phase).toBe('baseline');
});

test('rejects a date that has not happened yet', () => {
  expect(() => assertLoggableDate('2026-08-21', NOW, START, 'check-ins')).toThrow(/has not happened/i);
});

test('rejects a date before the cohort start', () => {
  expect(() => assertLoggableDate('2026-07-31', NOW, START, 'check-ins')).toThrow(/not started/i);
});

// The wrapper is reachable by direct POST, so the shape is checked before the
// value reaches a query or a date parser.
test('rejects a malformed date', () => {
  expect(() => assertLoggableDate('20-08-2026', NOW, START, 'check-ins')).toThrow(/YYYY-MM-DD/);
});

test('rejects a date-shaped string that is not a real calendar date', () => {
  expect(() => assertLoggableDate('2026-02-31', NOW, START, 'check-ins')).toThrow(/YYYY-MM-DD/);
});

// Closing the window leaves missed protocol days open for backfill.
test('accepts a protocol day once the protocol is complete', () => {
  const after = new Date('2026-09-20T02:00:00Z');
  expect(assertLoggableDate('2026-08-05', after, START, 'check-ins')).toEqual({
    localDate: '2026-08-05',
    phase: 'baseline',
  });
});

test('rejects a day past the protocol window, naming the caller', () => {
  const after = new Date('2026-09-20T02:00:00Z');
  expect(() => assertLoggableDate('2026-09-20', after, START, 'sessions')).toThrow(/sessions are closed/i);
});
