import { hashPasscode, verifyPasscode, generatePasscode } from '@/lib/passcode';
test('hash then verify round-trips, case-insensitive, trimmed', async () => {
  const h = await hashPasscode('RUN-4821');
  expect(await verifyPasscode(' run-4821 ', h)).toBe(true);
  expect(await verifyPasscode('RUN-0000', h)).toBe(false);
});
test('generatePasscode matches RUN-####', () => {
  expect(generatePasscode()).toMatch(/^RUN-\d{4}$/);
});
