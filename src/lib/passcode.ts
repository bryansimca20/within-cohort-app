import bcrypt from 'bcryptjs';
const normalize = (s: string) => s.trim();
export async function hashPasscode(plain: string) { return bcrypt.hash(normalize(plain), 10); }
export async function verifyPasscode(plain: string, hash: string) { return bcrypt.compare(normalize(plain), hash); }
// A 4-digit passcode, 1000-9999 (always 4 chars, never a leading-zero code).
export function generatePasscode() {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return String(n);
}
