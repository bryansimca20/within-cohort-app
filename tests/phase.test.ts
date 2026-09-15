import { getPhase, phaseProgress } from '@/lib/phase';
const start = '2026-08-01';
test('before start is pre', () => expect(getPhase(start, '2026-07-31').state).toBe('pre'));
test('day 0 is baseline', () => expect(getPhase(start, '2026-08-01').state).toBe('baseline'));
test('day 13 is baseline', () => expect(getPhase(start, '2026-08-14').state).toBe('baseline'));
test('day 14 is within', () => expect(getPhase(start, '2026-08-15').state).toBe('within'));
test('day 27 is within', () => expect(getPhase(start, '2026-08-28').state).toBe('within'));
// Within runs 4 weeks (days 14-41), not 2. The protocol is 6 weeks end to end.
test('day 28 is still within', () => expect(getPhase(start, '2026-08-29').state).toBe('within'));
test('day 41 is the last within day', () => expect(getPhase(start, '2026-09-11').state).toBe('within'));
test('day 42 is complete', () => expect(getPhase(start, '2026-09-12').state).toBe('complete'));
test('reports dayIndex', () => expect(getPhase(start, '2026-08-15').dayIndex).toBe(14));

// The Today counter and the admin dashboard label both need "day N of M"
// within the current phase. Deriving it in each page meant repeating a
// magic `- 13`, which is the off-by-one most likely to drift when a phase
// length changes.
test('phaseProgress counts the first baseline day as 1 of 14', () =>
  expect(phaseProgress('baseline', 0)).toEqual({ day: 1, total: 14 }));
test('phaseProgress counts the last baseline day as 14 of 14', () =>
  expect(phaseProgress('baseline', 13)).toEqual({ day: 14, total: 14 }));
test('phaseProgress restarts at 1 of 28 on the first within day', () =>
  expect(phaseProgress('within', 14)).toEqual({ day: 1, total: 28 }));
test('phaseProgress counts the last within day as 28 of 28', () =>
  expect(phaseProgress('within', 41)).toEqual({ day: 28, total: 28 }));
