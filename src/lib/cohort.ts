// Cohort-wide config that is the same for every member, so it lives in the
// environment / a constant rather than per-member columns. The whole cohort
// shares one start date and one timezone.

// Every member runs on Jakarta time. This is a constant (not per-member), so
// callers pass it into localDateFor instead of reading it off a member row.
export const COHORT_TIMEZONE = 'Asia/Jakarta';

const START_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Read the single cohort start date from the environment. Trusted boundary:
// the phase calendar is meaningless without it, so a missing/malformed value
// is a hard configuration error, not something to default around.
export function getCohortStartDate(): string {
  const raw = process.env.COHORT_START_DATE;
  if (!raw || !START_DATE_RE.test(raw)) {
    throw new Error('COHORT_START_DATE must be set to a YYYY-MM-DD date');
  }
  return raw;
}
