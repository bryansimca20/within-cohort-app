import { checkinSchema, sessionSchema } from '@/lib/validation';
test('valid checkin passes', () => {
  expect(checkinSchema.safeParse({ recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1, note: '' }).success).toBe(true);
});
test('hooper above 5 fails', () => {
  expect(checkinSchema.safeParse({ recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 6, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 }).success).toBe(false);
});
test('session other requires sessionTypeOther', () => {
  expect(sessionSchema.safeParse({ sessionType: 'other', rpe: 5, durationMin: 50, distanceKm: 10 }).success).toBe(false);
  expect(sessionSchema.safeParse({ sessionType: 'other', sessionTypeOther: 'fartlek', rpe: 5, durationMin: 50, distanceKm: 10 }).success).toBe(true);
});

// HRV is optional: not every watch reports it every morning, so a check-in
// must save without it. The coercion traps matter here, because
// z.coerce.number() turns both null and '' into 0, which would otherwise
// persist a missing reading as a real zero.
const baseCheckin = { recovery: 72, restingHr: 48, sleepMinutes: 450, hooperSleep: 3, hooperFatigue: 2, hooperSoreness: 2, hooperStress: 1 };

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

// Sleep is stored as whole minutes so a clock-style entry round-trips exactly.
// The ceiling is 960 (16:00), the same implausibility guard the decimal-hours
// field carried.
test('checkinSchema accepts a whole-minute sleep duration', () => {
  const parsed = checkinSchema.safeParse({ ...baseCheckin, sleepMinutes: 367 });
  expect(parsed.success && parsed.data.sleepMinutes).toBe(367);
});
test('checkinSchema coerces a numeric sleepMinutes string', () => {
  const parsed = checkinSchema.safeParse({ ...baseCheckin, sleepMinutes: '367' });
  expect(parsed.success && parsed.data.sleepMinutes).toBe(367);
});
test('checkinSchema rejects a sleep duration above 16 hours', () => {
  expect(checkinSchema.safeParse({ ...baseCheckin, sleepMinutes: 961 }).success).toBe(false);
});
test('checkinSchema rejects a fractional sleepMinutes', () => {
  expect(checkinSchema.safeParse({ ...baseCheckin, sleepMinutes: 367.5 }).success).toBe(false);
});
