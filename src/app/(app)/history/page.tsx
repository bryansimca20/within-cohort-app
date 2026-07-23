import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { localDateFor } from '@/lib/dates';
import { computeStreak } from '@/lib/streak';

type CheckinRow = typeof dailyCheckins.$inferSelect;
type SessionRow = typeof sessionLogs.$inferSelect;
type Phase = CheckinRow['phase'];

type DayGroup = {
  localDate: string;
  phase: Phase;
  checkin: CheckinRow | null;
  sessions: SessionRow[];
};

// Pure grouping core: merge a member's check-ins and session logs, keyed by
// local date, into one row per day. A day's phase comes from whichever row
// is present (check-in wins if both exist; they should always agree since
// both are stamped from the same getPhase call on the day they were saved).
// Sorted newest first.
function groupByDate(checkins: CheckinRow[], sessions: SessionRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const c of checkins) {
    map.set(c.localDate, { localDate: c.localDate, phase: c.phase, checkin: c, sessions: [] });
  }
  for (const s of sessions) {
    const existing = map.get(s.localDate);
    if (existing) {
      existing.sessions.push(s);
    } else {
      map.set(s.localDate, { localDate: s.localDate, phase: s.phase, checkin: null, sessions: [s] });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.localDate < b.localDate ? 1 : a.localDate > b.localDate ? -1 : 0));
}

// 'YYYY-MM-DD' is a plain calendar date with no time component; parsing it
// and re-formatting it must stay pinned to UTC end to end, otherwise a
// negative-offset server timezone can roll the displayed date back a day.
function formatDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function phaseLabel(phase: Phase): string {
  return phase === 'baseline' ? 'Baseline' : 'On Within';
}

const SESSION_TYPE_LABELS: Record<SessionRow['sessionType'], string> = {
  easy: 'Easy',
  long: 'Long',
  tempo: 'Tempo',
  interval: 'Interval',
  recovery: 'Recovery',
  race: 'Race',
  other: 'Other',
};

function sessionTypeLabel(session: SessionRow): string {
  if (session.sessionType === 'other') {
    return session.sessionTypeOther || 'Other';
  }
  return SESSION_TYPE_LABELS[session.sessionType];
}

export default async function HistoryPage() {
  const member = await requireMember();
  const today = localDateFor(member.timezone, new Date());

  const checkins = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.memberId, member.id))
    .orderBy(desc(dailyCheckins.localDate));

  const sessions = await db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.memberId, member.id))
    .orderBy(desc(sessionLogs.localDate));

  const streak = computeStreak(
    checkins.map((c) => c.localDate),
    today,
  );
  const days = groupByDate(checkins, sessions);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <dl className="flex items-center justify-between text-sm">
          <div>
            <dt className="opacity-70">Streak</dt>
            <dd className="mt-1 font-medium">{streak} day{streak === 1 ? '' : 's'}</dd>
          </div>
          <div className="text-right">
            <dt className="opacity-70">Days logged</dt>
            <dd className="mt-1 font-medium">{days.length}</dd>
          </div>
        </dl>
      </div>

      {days.length === 0 ? (
        <div className="rounded-[10px] border border-black/10 bg-white p-5 text-sm opacity-70 dark:border-white/10 dark:bg-black">
          No entries yet.{' '}
          <Link href="/checkin" className="font-medium underline">
            Log today&apos;s check-in
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => {
            const isToday = day.localDate === today;
            return (
              <div
                key={day.localDate}
                className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{formatDate(day.localDate)}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.2em] opacity-50">{phaseLabel(day.phase)}</p>
                  </div>
                  {isToday && <span className="text-xs font-medium opacity-50">Today</span>}
                </div>

                <div className="mt-4 flex flex-col gap-4 border-t border-black/10 pt-4 dark:border-white/10">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] opacity-50">Check-in</p>
                      {isToday && (
                        <Link href="/checkin" className="text-xs font-medium underline">
                          Edit
                        </Link>
                      )}
                    </div>
                    {day.checkin ? (
                      <p className="mt-1 text-sm leading-relaxed">
                        Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr} · Sleep {day.checkin.sleepHours}h
                        <br />
                        Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                        {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm opacity-50">No check-in</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] opacity-50">Sessions</p>
                      {isToday && (
                        <Link href="/session" className="text-xs font-medium underline">
                          Add
                        </Link>
                      )}
                    </div>
                    {day.sessions.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-1.5 text-sm">
                        {day.sessions.map((s) => (
                          <li key={s.id}>
                            {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {s.distanceKm} km
                            {s.tookServing ? ' · Took serving' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm opacity-50">No sessions</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
