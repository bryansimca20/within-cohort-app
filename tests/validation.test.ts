import { checkinSchema, sessionSchema } from '@/lib/validation';
test('valid checkin passes', () => {
  expect(checkinSchema.safeParse({ recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: '' }).success).toBe(true);
});
test('hooper above 5 fails', () => {
  expect(checkinSchema.safeParse({ recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 6, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 }).success).toBe(false);
});
test('session other requires sessionTypeOther', () => {
  expect(sessionSchema.safeParse({ sessionType: 'other', rpe: 5, durationMin: 50, distanceKm: 10 }).success).toBe(false);
  expect(sessionSchema.safeParse({ sessionType: 'other', sessionTypeOther: 'fartlek', rpe: 5, durationMin: 50, distanceKm: 10 }).success).toBe(true);
});

// HRV is optional: not every watch reports it every morning, so a check-in
// must save without it. The coercion traps matter here, because
// z.coerce.number() turns both null and '' into 0, which would otherwise
// persist a missing reading as a real zero.
const baseCheckin = { recovery: 72, restingHr: 48, sleepHours: 7.5, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 };

test('checkinSchema accepts an hrvMs reading', () => {
  const parsed = checkinSchema.safeParse({ ...baseCheckin, hrvMs: 52 });
  expect(parsed.success).toBe(true);
  expect(parsed.success && parsed.data.hrvMs).toBe(52);
});
test('checkinSchema accepts a checkin with no hrvMs at all', () => {
  const parsed = checkinSchema.safeParse(baseCheckin);
  expect(parsed.success).toBe(true);
  expect(parsed.success && parsed.data.hrvMs).toBeUndefined();
});
test('checkinSchema coerces a numeric hrvMs string from FormData', () => {
  const parsed = checkinSchema.safeParse({ ...baseCheckin, hrvMs: '61' });
  expect(parsed.success && parsed.data.hrvMs).toBe(61);
});
test('checkinSchema rejects an hrvMs of 0, which is what a blank field coerces to', () => {
  expect(checkinSchema.safeParse({ ...baseCheckin, hrvMs: 0 }).success).toBe(false);
});
test('checkinSchema rejects an implausibly high hrvMs', () => {
  expect(checkinSchema.safeParse({ ...baseCheckin, hrvMs: 301 }).success).toBe(false);
});
test('checkinSchema rejects a fractional hrvMs', () => {
  expect(checkinSchema.safeParse({ ...baseCheckin, hrvMs: 52.4 }).success).toBe(false);
});
