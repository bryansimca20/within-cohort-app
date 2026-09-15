import { formatHhMm, maskHhMm, parseHhMm } from '@/lib/duration';

// Sleep is captured as a clock-style duration ("7:30"), not decimal hours, so
// the parse layer has to be forgiving about how a half-awake member types it
// while still refusing anything ambiguous.

test('parses a padded hh:mm', () => {
  expect(parseHhMm('06:07')).toBe(367);
});
test('parses an unpadded h:mm', () => {
  expect(parseHhMm('6:07')).toBe(367);
});
test('parses a single-digit minute as that minute, not as tens', () => {
  expect(parseHhMm('6:7')).toBe(367);
});
test('parses bare hours as a whole hour', () => {
  expect(parseHhMm('7')).toBe(420);
});
test('parses zero', () => {
  expect(parseHhMm('0:00')).toBe(0);
});
test('ignores surrounding whitespace', () => {
  expect(parseHhMm('  7:30  ')).toBe(450);
});

test('rejects an empty string', () => {
  expect(parseHhMm('')).toBeNull();
});
test('rejects minutes of 60 or more', () => {
  expect(parseHhMm('6:60')).toBeNull();
});
test('rejects a dangling colon', () => {
  expect(parseHhMm('6:')).toBeNull();
});
test('rejects a missing hour', () => {
  expect(parseHhMm(':30')).toBeNull();
});
test('rejects decimal hours, which the old field accepted', () => {
  expect(parseHhMm('7.5')).toBeNull();
});
test('rejects a negative duration', () => {
  expect(parseHhMm('-1:00')).toBeNull();
});
test('rejects non-numeric input', () => {
  expect(parseHhMm('abc')).toBeNull();
});
test('rejects a three-digit minute', () => {
  expect(parseHhMm('6:007')).toBeNull();
});

// Range lives in checkinSchema, not here: the parser reports shape only.
test('parses an out-of-range duration and leaves the ceiling to validation', () => {
  expect(parseHhMm('24:00')).toBe(1440);
});

test('formats minutes with a padded minute and an unpadded hour', () => {
  expect(formatHhMm(367)).toBe('6:07');
});
test('formats a whole hour', () => {
  expect(formatHhMm(420)).toBe('7:00');
});
test('formats zero', () => {
  expect(formatHhMm(0)).toBe('0:00');
});
test('round-trips every minute in the valid range', () => {
  for (let m = 0; m <= 960; m += 1) {
    expect(parseHhMm(formatHhMm(m))).toBe(m);
  }
});

// The check-in form is used one-handed at 7am on a phone, where the numeric
// keypad has no colon key. The mask puts the colon in as digits arrive, so
// minutes are always the last two typed.
test('masks nothing while the hour is still being typed', () => {
  expect(maskHhMm('7')).toBe('7');
  expect(maskHhMm('07')).toBe('07');
});
test('masks a three-digit entry as h:mm', () => {
  expect(maskHhMm('607')).toBe('6:07');
});
test('masks a four-digit entry as hh:mm', () => {
  expect(maskHhMm('0730')).toBe('07:30');
});
test('masks an empty entry to empty', () => {
  expect(maskHhMm('')).toBe('');
});
test('re-masks a value that already contains a colon', () => {
  expect(maskHhMm('6:07')).toBe('6:07');
});
test('drops characters that are not digits', () => {
  expect(maskHhMm('7h30m')).toBe('7:30');
});
test('stops at four digits', () => {
  expect(maskHhMm('073012')).toBe('07:30');
});
test('masked output parses back to the minutes it represents', () => {
  expect(parseHhMm(maskHhMm('607'))).toBe(367);
});
