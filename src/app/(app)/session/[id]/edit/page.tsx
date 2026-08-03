import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import { ClosedNotice } from '@/components/ClosedNotice';
import { SessionForm } from '@/components/SessionForm';
import { updateSessionAction } from '../../actions';

/** Short "Jul 28" label, pinned to UTC so a negative-offset server timezone can't roll a plain 'YYYY-MM-DD' back a day. */
function formatDateLabel(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Edit one of the runner's own sessions. Ownership + protocol-window gated; the
 *  row's date and phase are shown read-only in the header and never change on save. */
export default async function EditSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { id } = await params;
  const { from, error } = await searchParams;
  const member = await requireMember();

  const startDate = await getCohortStartDateOrNull(db);
  if (!startDate) {
    return <ClosedNotice title="Edit session" message="Session editing opens once the cohort start date is set." />;
  }

  const state = getPhase(startDate, localDateFor(COHORT_TIMEZONE, new Date())).state;
  if (state === 'pre' || state === 'complete') {
    return (
      <ClosedNotice
        title="Edit session"
        message={
          state === 'pre'
            ? 'The protocol has not started yet. Nothing to edit.'
            : 'The protocol is complete. Your entries are locked and can no longer be edited.'
        }
      />
    );
  }

  const [row] = await db
    .select()
    .from(sessionLogs)
    .where(and(eq(sessionLogs.id, id), eq(sessionLogs.memberId, member.id)));
  if (!row) notFound();

  const backTo: 'session' | 'history' = from === 'session' ? 'session' : 'history';

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-28" data-surface="dark">
      <h1 className="text-h2 font-bold tracking-[-0.02em] uppercase">Edit session</h1>
      <p className="mt-1 text-xs text-wi-on-dark-2">
        {formatDateLabel(row.localDate)} · {row.phase === 'within' ? 'Within' : 'Baseline'}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {error && (
          <p role="alert" className="text-sm text-wi-paper">
            Please fill in every field before saving.
          </p>
        )}

        <SessionForm
          action={updateSessionAction.bind(null, row.id)}
          showServingToggle={row.phase === 'within'}
          submitLabel="Update session"
          from={backTo}
          existing={{
            sessionType: row.sessionType,
            sessionTypeOther: row.sessionTypeOther,
            rpe: row.rpe,
            durationMin: row.durationMin,
            distanceKm: row.distanceKm,
            tookServing: row.tookServing,
            note: row.note,
          }}
        />
      </div>
    </div>
  );
}
