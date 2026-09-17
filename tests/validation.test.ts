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

// A member can take more than one serving in a session, so this is a count,
// not a yes/no. 0 is a real answer (toggle off); 4 is the most the form offers.
const baseSession = { sessionType: 'easy', rpe: 5, durationMin: 50, distanceKm: 10 };

test('sessionSchema accepts a serving count', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, servings: 2 });
  expect(parsed.success && parsed.data.servings).toBe(2);
});
test('sessionSchema accepts zero servings as a real answer', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, servings: 0 });
  expect(parsed.success && parsed.data.servings).toBe(0);
});
test('sessionSchema coerces a servings string from FormData', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, servings: '3' });
  expect(parsed.success && parsed.data.servings).toBe(3);
});
test('sessionSchema accepts a session with no servings answer', () => {
  const parsed = sessionSchema.safeParse(baseSession);
  expect(parsed.success && parsed.data.servings).toBeUndefined();
});
test('sessionSchema rejects more than 4 servings', () => {
  expect(sessionSchema.safeParse({ ...baseSession, servings: 5 }).success).toBe(false);
});
test('sessionSchema rejects a negative serving count', () => {
  expect(sessionSchema.safeParse({ ...baseSession, servings: -1 }).success).toBe(false);
});
test('sessionSchema rejects a fractional serving count', () => {
  expect(sessionSchema.safeParse({ ...baseSession, servings: 1.5 }).success).toBe(false);
});

// Distance is the one field a member types free-hand on a keypad whose decimal
// separator depends on the device region, so the schema owns the normalisation.
test('sessionSchema accepts a comma as the decimal separator', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, distanceKm: '5,25' });
  expect(parsed.success && parsed.data.distanceKm).toBe(5.25);
});
test('sessionSchema accepts a dot as the decimal separator', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, distanceKm: '5.25' });
  expect(parsed.success && parsed.data.distanceKm).toBe(5.25);
});
test('sessionSchema accepts two decimal places', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, distanceKm: 12.34 });
  expect(parsed.success && parsed.data.distanceKm).toBe(12.34);
});
test('sessionSchema rounds a distance finer than the column scale', () => {
  const parsed = sessionSchema.safeParse({ ...baseSession, distanceKm: 5.256 });
  expect(parsed.success && parsed.data.distanceKm).toBe(5.26);
});
test('sessionSchema rejects a distance that is not a number', () => {
  expect(sessionSchema.safeParse({ ...baseSession, distanceKm: 'ten' }).success).toBe(false);
  expect(sessionSchema.safeParse({ ...baseSession, distanceKm: '' }).success).toBe(false);
});
test('sessionSchema still holds the distance range', () => {
  expect(sessionSchema.safeParse({ ...baseSession, distanceKm: '-1' }).success).toBe(false);
  expect(sessionSchema.safeParse({ ...baseSession, distanceKm: '100,01' }).success).toBe(false);
});
