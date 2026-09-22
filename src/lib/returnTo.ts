/** Where a session edit or delete returns to: the Session screen, History, or one day screen. */
export type SessionReturnTo = 'session' | 'history' | `day:${string}`;

const DAY_TOKEN_RE = /^day:(\d{4}-\d{2}-\d{2})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Which screen owns the check-in form for `targetDate`: the today capture
 * screen, or that day's own screen. The wrapper uses it to send validation
 * errors back where the member submitted from, so the date is shape-checked
 * before it becomes a path.
 */
export function checkinScreenPath(targetDate: string, today: string): string {
  if (!DATE_RE.test(targetDate) || targetDate === today) return '/checkin';
  return `/day/${targetDate}/checkin`;
}

/**
 * Resolves a submitted `from` token to an in-app path. The token rides on a
 * form field, so it reaches `redirect()` from the client: it is matched against
 * the three known shapes and never interpolated into a path unchecked, and
 * anything else falls back to History. An unvalidated value here would be an
 * open redirect.
 */
export function returnToPath(from: string): string {
  if (from === 'session') return '/session';

  // A past day's sessions are only listed and edited on that day's session
  // screen, so a session action returns there: logging a second session is a
  // second submit, with no navigation in between.
  const day = DAY_TOKEN_RE.exec(from);
  if (day) return `/day/${day[1]}/session`;

  return '/history';
}

/**
 * Normalises an origin token arriving from a query string back into a known
 * `SessionReturnTo`. Anything unrecognised becomes History, so a tampered value
 * can never be handed to a form and echoed into a later redirect.
 */
export function asReturnTo(from: string | undefined): SessionReturnTo {
  if (from === 'session') return 'session';
  const day = DAY_TOKEN_RE.exec(from ?? '');
  if (day) return `day:${day[1]}`;
  return 'history';
}
