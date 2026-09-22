import { returnToPath, checkinScreenPath, asReturnTo } from '@/lib/returnTo';

test('resolves the session screen', () => {
  expect(returnToPath('session')).toBe('/session');
});

test('resolves the history screen', () => {
  expect(returnToPath('history')).toBe('/history');
});

// Sessions on a past day are only ever edited from that day's session screen,
// so a session action returns there rather than to the day hub.
test('resolves a day token to that day\'s session screen', () => {
  expect(returnToPath('day:2026-08-05')).toBe('/day/2026-08-05/session');
});

// The token arrives on a form field, so it reaches redirect() from the client.
// Anything that is not one of the three known shapes falls back to History
// rather than being interpolated into a path.
test('falls back to history for an unknown token', () => {
  expect(returnToPath('admin')).toBe('/history');
});

test('refuses an absolute URL smuggled in as a day', () => {
  expect(returnToPath('day:https://evil.example')).toBe('/history');
});

test('refuses a protocol-relative path', () => {
  expect(returnToPath('//evil.example')).toBe('/history');
});

test('refuses a traversal attempt inside a day token', () => {
  expect(returnToPath('day:../../admin/members')).toBe('/history');
});

test('falls back to history for an empty token', () => {
  expect(returnToPath('')).toBe('/history');
});

// --- checkinScreenPath ---------------------------------------------------
// The check-in form lives on two screens. The wrapper sends validation errors
// and saves back to whichever one the member submitted from.

test('checkinScreenPath keeps today on the today capture screen', () => {
  expect(checkinScreenPath('2026-08-20', '2026-08-20')).toBe('/checkin');
});

test('checkinScreenPath sends an earlier day to that day\'s check-in screen', () => {
  expect(checkinScreenPath('2026-08-05', '2026-08-20')).toBe('/day/2026-08-05/checkin');
});

test('checkinScreenPath falls back to the capture screen for a malformed date', () => {
  expect(checkinScreenPath('../admin', '2026-08-20')).toBe('/checkin');
});

// --- asReturnTo ----------------------------------------------------------
// The edit route carries the origin through a query string, so the token is
// normalised on the way back into the form rather than trusted.

test('asReturnTo keeps a valid day token', () => {
  expect(asReturnTo('day:2026-08-05')).toBe('day:2026-08-05');
});

test('asReturnTo keeps the session screen', () => {
  expect(asReturnTo('session')).toBe('session');
});

test('asReturnTo falls back to history for anything else', () => {
  expect(asReturnTo('day:evil')).toBe('history');
  expect(asReturnTo(undefined)).toBe('history');
});
