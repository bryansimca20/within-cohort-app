import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { FlameIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { localDateFor } from '@/lib/dates';
import { computeStreak } from '@/lib/streak';
import { groupByDate, formatDate, phaseLabel, sessionTypeLabel } from '@/lib/history';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
        <h1 className="text-2xl font-semibold text-wi-black">History</h1>
      </div>

      <Card>
        <CardContent>
          <dl className="flex items-center justify-between text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-wi-ink-500">
                <FlameIcon className="size-4 text-wi-black" />
                Streak
              </dt>
              <dd className="mt-1 font-medium text-wi-black">
                {streak} day{streak === 1 ? '' : 's'}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-wi-ink-500">Days logged</dt>
              <dd className="mt-1 font-medium text-wi-black">{days.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {days.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-wi-ink-500">
            No entries yet.{' '}
            <Link href="/checkin" className="font-medium text-wi-black underline">
              Log today&apos;s check-in
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => {
            const isToday = day.localDate === today;
            return (
              <Card key={day.localDate}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-wi-black">{formatDate(day.localDate)}</p>
                      <Badge variant="outline" className="mt-1.5">
                        {phaseLabel(day.phase)}
                      </Badge>
                    </div>
                    {isToday && <span className="text-xs font-medium text-wi-ink-500">Today</span>}
                  </div>

                  <div className="mt-4 flex flex-col gap-4 border-t border-wi-line pt-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-wi-ink-500">Check-in</p>
                        {isToday && (
                          <Link
                            href="/checkin"
                            className="flex items-center gap-1 text-xs font-medium text-wi-black underline"
                          >
                            <PencilIcon className="size-3" />
                            Edit
                          </Link>
                        )}
                      </div>
                      {day.checkin ? (
                        <p className="mt-1 text-sm leading-relaxed text-wi-black">
                          Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr} · Sleep{' '}
                          {day.checkin.sleepHours}h
                          <br />
                          Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                          {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-wi-ink-300">No check-in</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-wi-ink-500">Sessions</p>
                        {isToday && (
                          <Link
                            href="/session"
                            className="flex items-center gap-1 text-xs font-medium text-wi-black underline"
                          >
                            <PlusIcon className="size-3" />
                            Add
                          </Link>
                        )}
                      </div>
                      {day.sessions.length > 0 ? (
                        <ul className="mt-1 flex flex-col gap-1.5 text-sm text-wi-black">
                          {day.sessions.map((s) => (
                            <li key={s.id}>
                              {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {s.distanceKm} km
                              {s.tookServing ? ' · Took serving' : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-wi-ink-300">No sessions</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
