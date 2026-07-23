import { localDateFor, daysBetween, isValidTimeZone } from '@/lib/dates';

test('localDateFor returns Jakarta calendar date', () => {
  // 2026-08-01T18:30:00Z is 2026-08-02 01:30 in Jakarta (UTC+7)
  expect(localDateFor('Asia/Jakarta', new Date('2026-08-01T18:30:00Z'))).toBe('2026-08-02');
});
test('daysBetween counts whole days', () => {
  expect(daysBetween('2026-08-01', '2026-08-15')).toBe(14);
  expect(daysBetween('2026-08-01', '2026-07-31')).toBe(-1);
});
test('isValidTimeZone accepts a real IANA timezone', () => {
  expect(isValidTimeZone('Asia/Jakarta')).toBe(true);
});
test('isValidTimeZone rejects a bogus timezone', () => {
  expect(isValidTimeZone('Not/AZone')).toBe(false);
});
