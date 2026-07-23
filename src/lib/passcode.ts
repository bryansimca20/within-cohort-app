import bcrypt from 'bcryptjs';
const normalize = (s: string) => s.trim().toLowerCase();
export async function hashPasscode(plain: string) { return bcrypt.hash(normalize(plain), 10); }
export async function verifyPasscode(plain: string, hash: string) { return bcrypt.compare(normalize(plain), hash); }
export function generatePasscode() {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `RUN-${n}`;
}
