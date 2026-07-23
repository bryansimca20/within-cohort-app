import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { groupByDate, formatDate, phaseLabel, sessionTypeLabel } from '@/lib/history';

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
