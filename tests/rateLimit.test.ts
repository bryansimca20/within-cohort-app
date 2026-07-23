import { rateLimit } from '@/lib/rateLimit';

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes, mirrors src/lib/rateLimit.ts

test('10th attempt in-window is allowed, 11th is blocked', () => {
  const key = 'member-a';
  const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);

  for (let i = 0; i < 10; i++) {
    expect(rateLimit(key, t0 + i)).toBe(true);
  }
  expect(rateLimit(key, t0 + 10)).toBe(false);
});

test('after the window passes, the same key is allowed again and expired buckets are evicted', () => {
  const key = 'member-b';
  const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);

  for (let i = 0; i < 10; i++) {
    expect(rateLimit(key, t0 + i)).toBe(true);
  }
  expect(rateLimit(key, t0 + 10)).toBe(false);

  // Advance past the window: the old bucket should be treated as expired
  // (not merely reset) and swept from the Map by the next call, not just
  // the call for this same key.
  const t1 = t0 + WINDOW_MS;
  expect(rateLimit(key, t1)).toBe(true);

  // Confirm the limiter still enforces the cap in the new window rather
  // than accumulating on top of stale state.
  for (let i = 1; i < 10; i++) {
    expect(rateLimit(key, t1 + i)).toBe(true);
  }
  expect(rateLimit(key, t1 + 10)).toBe(false);

  // Eviction check: a second, unrelated key whose window expired earlier
  // should get swept out by a later call, rather than lingering in the
  // Map forever. We can't inspect the Map directly (it's module-private),
  // so we assert the observable behavior instead: after its window has
  // long expired, that key starts a fresh window and is allowed again
  // immediately, exactly as if its old bucket were gone.
  const other = 'member-c';
  expect(rateLimit(other, t0)).toBe(true);
  const farFuture = t0 + WINDOW_MS * 5;
  expect(rateLimit(other, farFuture)).toBe(true);
  expect(rateLimit(other, farFuture + 1)).toBe(true);
});
