import { maskDecimal, parseDecimal, roundTo, trimTrailingZeros } from '@/lib/decimal';

test('maskDecimal keeps digits and drops anything else', () => {
  expect(maskDecimal('12km')).toBe('12');
  expect(maskDecimal('-5')).toBe('5');
});

test('maskDecimal keeps whichever separator the keypad produced', () => {
  expect(maskDecimal('5,25')).toBe('5,25');
  expect(maskDecimal('5.25')).toBe('5.25');
});

test('maskDecimal keeps a trailing separator so the member can keep typing', () => {
  expect(maskDecimal('5,')).toBe('5,');
  expect(maskDecimal('5.')).toBe('5.');
});

test('maskDecimal caps the fraction at two places', () => {
  expect(maskDecimal('5.2567')).toBe('5.25');
  expect(maskDecimal('5,2567')).toBe('5,25');
});

test('maskDecimal ignores a second separator', () => {
  expect(maskDecimal('5.2.5')).toBe('5.25');
  expect(maskDecimal('5,2.5')).toBe('5,25');
});

test('parseDecimal accepts the comma separator some iOS keypads produce', () => {
  expect(parseDecimal('5,25')).toBe(5.25);
  expect(parseDecimal('5.25')).toBe(5.25);
  expect(parseDecimal(' 12 ')).toBe(12);
  expect(parseDecimal('.5')).toBe(0.5);
});

test('parseDecimal returns null for anything that is not a plain decimal', () => {
  expect(parseDecimal('')).toBeNull();
  expect(parseDecimal('.')).toBeNull();
  expect(parseDecimal('abc')).toBeNull();
  expect(parseDecimal('-5')).toBeNull();
  expect(parseDecimal('5,2,5')).toBeNull();
});

test('roundTo holds a value to the column scale', () => {
  expect(roundTo(5.256, 2)).toBe(5.26);
  expect(roundTo(5.254, 2)).toBe(5.25);
  expect(roundTo(12, 2)).toBe(12);
});

test('trimTrailingZeros renders a fixed-scale numeric the way a member reads it', () => {
  expect(trimTrailingZeros('12.30')).toBe('12.3');
  expect(trimTrailingZeros('20.00')).toBe('20');
  expect(trimTrailingZeros('100.00')).toBe('100');
  expect(trimTrailingZeros('5.25')).toBe('5.25');
  expect(trimTrailingZeros('30')).toBe('30');
});
