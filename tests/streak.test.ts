import { computeStreak } from '@/lib/streak';
test('counts consecutive days ending today', () => {
  expect(computeStreak(['2026-08-03','2026-08-02','2026-08-01'], '2026-08-03')).toBe(3);
});
test('gap breaks the streak', () => {
  expect(computeStreak(['2026-08-03','2026-08-01'], '2026-08-03')).toBe(1);
});
test('streak counts up to yesterday if today not yet logged', () => {
  expect(computeStreak(['2026-08-02','2026-08-01'], '2026-08-03')).toBe(2);
});
