import { getPhase } from '@/lib/phase';
const start = '2026-08-01';
test('before start is pre', () => expect(getPhase(start, '2026-07-31').state).toBe('pre'));
test('day 0 is baseline', () => expect(getPhase(start, '2026-08-01').state).toBe('baseline'));
test('day 13 is baseline', () => expect(getPhase(start, '2026-08-14').state).toBe('baseline'));
test('day 14 is within', () => expect(getPhase(start, '2026-08-15').state).toBe('within'));
test('day 27 is within', () => expect(getPhase(start, '2026-08-28').state).toBe('within'));
test('day 28 is complete', () => expect(getPhase(start, '2026-08-29').state).toBe('complete'));
test('reports dayIndex', () => expect(getPhase(start, '2026-08-15').dayIndex).toBe(14));
