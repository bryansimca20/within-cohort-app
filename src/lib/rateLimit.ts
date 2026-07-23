// In-memory, per-instance rate limiter. Good enough for a small, private cohort
// (single-digit concurrent users) but NOT a durable/global limiter: on serverless
// platforms each instance keeps its own counters, and a redeploy or cold start
// resets them. If this ever needs to be robust against a distributed attacker,
// move the counters to the database or a shared store (e.g. Redis) instead.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 10;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

/**
 * Records one attempt for `key` and reports whether the caller is still
 * within the allowed rate. Returns true when the attempt is allowed, false
 * when the caller has exceeded MAX_ATTEMPTS within the current window.
 *
 * Self-cleaning: every call sweeps `buckets` and deletes any entry whose
 * window has fully expired, so the Map cannot grow without bound even if
 * callers key it on attacker-controlled values. `now` defaults to
 * `Date.now()` and is only overridden by tests, which inject synthetic
 * timestamps to exercise window-expiry and eviction deterministically.
 */
export function rateLimit(key: string, now: number = Date.now()): boolean {
  for (const [k, b] of buckets) {
    if (now - b.windowStart >= WINDOW_MS) buckets.delete(k);
  }

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= MAX_ATTEMPTS) return false;

  bucket.count += 1;
  return true;
}
