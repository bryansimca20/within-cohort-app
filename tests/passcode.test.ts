import { hashPasscode, verifyPasscode, generatePasscode } from '@/lib/passcode';
test('hash then verify round-trips, trimmed', async () => {
  const h = await hashPasscode('4821');
  expect(await verifyPasscode(' 4821 ', h)).toBe(true);
  expect(await verifyPasscode('0000', h)).toBe(false);
});
test('generatePasscode is a 4-digit code', () => {
  expect(generatePasscode()).toMatch(/^\d{4}$/);
});
