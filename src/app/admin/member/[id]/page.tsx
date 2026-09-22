import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { ArrowLeftIcon } from 'lucide-react';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs, members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { buildLedger, groupByDate, formatDate, isLateEntry, phaseLabel, servingsLabel, sessionTypeLabel } from '@/lib/history';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatHhMm } from '@/lib/duration';
import { trimTrailingZeros } from '@/lib/decimal';

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

  // Founders see the same ledger the member does: every protocol day, with the
  // unlogged ones visible as gaps rather than inferred from missing rows. Before
  // a start date is set there is no calendar to lay out, so fall back to the rows.
  const startDate = await getCohortStartDateOrNull(db);
  const groups = groupByDate(checkins, sessions);
  const days = startDate
    ? buildLedger(startDate, localDateFor(COHORT_TIMEZONE, new Date()), groups)
    : groups.map((g) => ({ ...g, logged: true }));
  const loggedCount = days.filter((d) => d.logged).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="flex items-center gap-1 text-xs font-medium text-wi-black underline">
          <ArrowLeftIcon className="size-3" />
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-wi-black">{member.name}</h1>
      </div>

      <Card>
        <CardContent>
          <dl className="flex items-center justify-between text-sm">
            <div>
              <dt className="text-wi-ink-500">Days logged</dt>
              <dd className="mt-1 font-medium text-wi-black">
                {loggedCount}
                {startDate ? <span className="text-wi-ink-500"> of {days.length}</span> : null}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-wi-ink-500">In cohort</dt>
              <dd className="mt-1.5">
                <Badge variant={member.inCohort ? 'default' : 'outline'}>{member.inCohort ? 'Yes' : 'No'}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {days.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-wi-ink-500">No entries yet.</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <Card key={day.localDate}>
              <CardContent>
                <div>
                  <p className="text-sm font-semibold text-wi-black">{formatDate(day.localDate)}</p>
                  <Badge variant="outline" className="mt-1.5">
                    {phaseLabel(day.phase)}
                  </Badge>
                </div>

                {!day.logged ? (
                  <p className="mt-4 border-t border-wi-line pt-4 text-sm text-wi-ink-300">Not logged</p>
                ) : (
                <div className="mt-4 flex flex-col gap-4 border-t border-wi-line pt-4">
                  <div>
                    <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">
                      Check-in
                      {day.checkin && isLateEntry(day.localDate, day.checkin.createdAt) && (
                        <span className="ml-2 normal-case text-wi-ink-300">logged late</span>
                      )}
                    </p>
                    {day.checkin ? (
                      <p className="mt-1 text-sm leading-relaxed text-wi-black">
                        Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr}
                        {day.checkin.hrvMs !== null && <> · HRV {day.checkin.hrvMs} ms</>} · Sleep{' '}
                        {formatHhMm(day.checkin.sleepMinutes)}
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
                      <p className="mt-1 text-sm text-wi-ink-300">No check-in</p>
                    )}
                  </div>

                  <div>
                    <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">Sessions</p>
                    {day.sessions.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-1.5 text-sm text-wi-black">
                        {day.sessions.map((s) => (
                          <li key={s.id}>
                            {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {trimTrailingZeros(s.distanceKm)} km
                            {s.servings ? ` · ${servingsLabel(s.servings)}` : ''}
                            {s.note ? ` · ${s.note}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-wi-ink-300">No sessions</p>
                    )}
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
