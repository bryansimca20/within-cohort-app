import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { localDateFor } from '@/lib/dates';
import { computeStreak } from '@/lib/streak';
import { groupByDate, formatDate, phaseLabel, sessionTypeLabel } from '@/lib/history';

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
