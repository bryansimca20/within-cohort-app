import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import { servingsLabel, sessionTypeLabel } from '@/lib/history';
import { trimTrailingZeros } from '@/lib/decimal';
import { ClosedNotice } from '@/components/ClosedNotice';
import { SessionForm } from '@/components/SessionForm';
import { SessionRowActions } from '@/components/SessionRowActions';
import { saveSessionAction } from './actions';

/** Session log: type/RPE/duration/distance for every session a member trains, plus the within-phase serving question. Event-triggered, phase-gated, multiple entries per day allowed. */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const member = await requireMember();
  const localDate = localDateFor(COHORT_TIMEZONE, new Date());
  const startDate = await getCohortStartDateOrNull(db);
  if (!startDate) {
    return (
      <ClosedNotice
        title="Sessions"
        message="Session logging opens once the cohort start date is set."
      />
    );
  }
  const state = getPhase(startDate, localDate).state;

  if (state === 'pre' || state === 'complete') {
    return (
      <ClosedNotice
        title="Sessions"
        message={
          state === 'pre'
            ? 'Session logging opens on day one of the protocol. Nothing to log yet.'
            : 'The protocol is complete. Session logging is closed and your entries are locked.'
        }
      />
    );
  }

  // The serving toggle only ever applies in the "within" phase; baseline
  // sessions never ask the question, and the pure core forces the stored
  // value to null regardless of what a form might send.
  const showServingToggle = state === 'within';

  const todaysSessions = await db
    .select()
    .from(sessionLogs)
    .where(and(eq(sessionLogs.memberId, member.id), eq(sessionLogs.localDate, localDate)))
    .orderBy(sessionLogs.createdAt);

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6" data-surface="dark">
      <h1 className="text-h2 font-bold tracking-[-0.02em] uppercase">Sessions</h1>
      <p className="mt-1 text-xs text-wi-on-dark-2">Every session, easy days included.</p>

      <div className="mt-6 flex flex-col gap-6">
        <div>
          <p className="text-base font-bold tracking-[0.04em] text-wi-paper uppercase">Today&apos;s sessions</p>
          {todaysSessions.length === 0 ? (
            <p className="mt-2 text-xs text-wi-on-dark-3">No sessions logged today yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {todaysSessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-wi-on-dark-line p-[14px]">
                  <p className="text-[13px] text-wi-on-dark-1">
                    {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {trimTrailingZeros(s.distanceKm)} km
                    {s.servings ? ` · ${servingsLabel(s.servings)}` : ''}
                  </p>
                  <SessionRowActions sessionId={s.id} from="session" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 border-t border-wi-on-dark-line pt-6">
          <div>
            <p className="text-base font-bold tracking-[0.04em] text-wi-paper uppercase">Log a session</p>
            <p className="mt-1 text-xs text-wi-on-dark-2">One entry per session.</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-wi-paper">
              {error === 'distance'
                ? 'Distance needs a number like 5.25.'
                : 'Please fill in every field before saving.'}
            </p>
          )}

          <div className="rounded-[8px] bg-wi-on-dark-fill px-[14px] py-[11px] text-xs text-wi-on-dark-2">
            Log right after, while the numbers are fresh.
          </div>

          <SessionForm action={saveSessionAction} showServingToggle={showServingToggle} submitLabel="Log session" from="session" />
        </div>
      </div>
    </div>
  );
}
