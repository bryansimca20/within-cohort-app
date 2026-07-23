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
