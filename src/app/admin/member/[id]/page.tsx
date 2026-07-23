import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';

type CheckinRow = typeof dailyCheckins.$inferSelect;
type SessionRow = typeof sessionLogs.$inferSelect;
type Phase = CheckinRow['phase'];

type DayGroup = {
  localDate: string;
  phase: Phase;
  checkin: CheckinRow | null;
  sessions: SessionRow[];
};

// Same grouping core as the member-facing History page (src/app/(app)/history/page.tsx):
// merge a member's check-ins and session logs, keyed by local date, into one
// row per day, newest first. Duplicated rather than imported because the two
// pages read different auth contexts (requireMember vs requireAdmin) and are
// free to diverge in rendering; the grouping logic itself is small and pure.
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

// Founder-facing, read-only drilldown into one member's full capture history.
// No edit/add affordances: this view never writes on a member's behalf.
export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) notFound();

  const checkins = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.memberId, id))
    .orderBy(desc(dailyCheckins.localDate));

  const sessions = await db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.memberId, id))
    .orderBy(desc(sessionLogs.localDate));

  const days = groupByDate(checkins, sessions);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-xs font-medium underline">
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{member.name}</h1>
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <dl className="flex items-center justify-between text-sm">
          <div>
            <dt className="opacity-70">Days logged</dt>
            <dd className="mt-1 font-medium">{days.length}</dd>
          </div>
          <div className="text-right">
            <dt className="opacity-70">In cohort</dt>
            <dd className="mt-1 font-medium">{member.inCohort ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </div>

      {days.length === 0 ? (
        <div className="rounded-[10px] border border-black/10 bg-white p-5 text-sm opacity-70 dark:border-white/10 dark:bg-black">
          No entries yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <div
              key={day.localDate}
              className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black"
            >
              <div>
                <p className="text-sm font-semibold">{formatDate(day.localDate)}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.2em] opacity-50">{phaseLabel(day.phase)}</p>
              </div>

              <div className="mt-4 flex flex-col gap-4 border-t border-black/10 pt-4 dark:border-white/10">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-50">Check-in</p>
                  {day.checkin ? (
                    <p className="mt-1 text-sm leading-relaxed">
                      Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr} · Sleep {day.checkin.sleepHours}h
                      <br />
                      Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                      {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                      {day.checkin.note ? (
                        <>
                          <br />
                          Note: {day.checkin.note}
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm opacity-50">No check-in</p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-50">Sessions</p>
                  {day.sessions.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1.5 text-sm">
                      {day.sessions.map((s) => (
                        <li key={s.id}>
                          {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {s.distanceKm} km
                          {s.tookServing ? ' · Took serving' : ''}
                          {s.note ? ` · ${s.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm opacity-50">No sessions</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
