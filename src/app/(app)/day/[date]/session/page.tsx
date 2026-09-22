import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/db/client';
import { sessionLogs } from '@/db/schema';
import { formatDate, phaseLabel, servingsLabel, sessionTypeLabel } from '@/lib/history';
import { trimTrailingZeros } from '@/lib/decimal';
import { shortDate } from '@/lib/dayLabel';
import { ClosedNotice } from '@/components/ClosedNotice';
import { SessionForm } from '@/components/SessionForm';
import { SessionRowActions } from '@/components/SessionRowActions';
import { saveSessionAction } from '../../../session/actions';
import { loadDayScreen } from '../guard';

/** Every session trained on one earlier day, plus the form to add another.
 *  Saving returns here rather than to the hub, so logging a double is submit,
 *  submit: the list above grows and the form comes back empty. Sessions have no
 *  per-day limit. */
export default async function DaySessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { date } = await params;
  const { error } = await searchParams;
  const screen = await loadDayScreen(date, '/session');

  if (screen.closed) {
    return (
      <ClosedNotice
        title="Sessions"
        message={
          screen.closed === 'no-start'
            ? 'Session logging opens once the cohort start date is set.'
            : screen.closed === 'pre'
              ? 'The protocol has not started yet. Nothing to log.'
              : 'The protocol is complete. Your entries are locked.'
        }
      />
    );
  }

  const { member, localDate, phase } = screen;

  const sessions = await db
    .select()
    .from(sessionLogs)
    .where(and(eq(sessionLogs.memberId, member.id), eq(sessionLogs.localDate, localDate)))
    .orderBy(sessionLogs.createdAt);

  const from = `day:${localDate}` as const;

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6" data-surface="dark">
      <Link
        href={`/day/${localDate}`}
        className="inline-flex items-center gap-1 text-2xs font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase"
      >
        <ChevronLeft className="size-3" />
        {formatDate(localDate)}
      </Link>

      <h1 className="mt-2 text-h2 font-bold tracking-[-0.02em] uppercase">Sessions</h1>
      <p className="mt-1 text-xs text-wi-on-dark-2">
        {formatDate(localDate)} · {phaseLabel(phase)}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <div>
          <p className="text-base font-bold tracking-[0.04em] text-wi-paper uppercase">
            Logged on {shortDate(localDate)}
          </p>
          {sessions.length === 0 ? (
            <p className="mt-2 text-xs text-wi-on-dark-3">Nothing logged for {shortDate(localDate)} yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-wi-on-dark-line p-[14px]">
                  <p className="text-[13px] text-wi-on-dark-1">
                    {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {trimTrailingZeros(s.distanceKm)} km
                    {s.servings ? ` · ${servingsLabel(s.servings)}` : ''}
                  </p>
                  <SessionRowActions sessionId={s.id} from={from} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 border-t border-wi-on-dark-line pt-6">
          <div>
            <p className="text-base font-bold tracking-[0.04em] text-wi-paper uppercase">
              {sessions.length > 0 ? 'Add another session' : 'Log a session'}
            </p>
            <p className="mt-1 text-xs text-wi-on-dark-2">One entry per session.</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-wi-paper">
              {error === 'distance'
                ? 'Distance needs a number like 5.25.'
                : 'Please fill in every field before saving.'}
            </p>
          )}

          <SessionForm
            action={saveSessionAction.bind(null, localDate)}
            showServingToggle={phase === 'within'}
            submitLabel={sessions.length > 0 ? 'Log another session' : 'Log session'}
            from={from}
          />
        </div>
      </div>
    </div>
  );
}
