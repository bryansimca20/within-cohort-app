import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import { shortDate } from '@/lib/dayLabel';
import { ClosedNotice } from '@/components/ClosedNotice';
import { CheckinForm } from '@/components/CheckinForm';
import { saveCheckinAction } from './actions';

/** Header sub-line phase word; only 'baseline'/'within' ever reach here, since 'pre'/'complete' return earlier. */
function checkinPhaseLabel(phase: 'baseline' | 'within'): string {
  return phase === 'baseline' ? 'Baseline' : 'Within';
}

/** Morning check-in: recovery/resting HR/sleep from the watch, the Hooper index, and an optional note. Same-day editable, phase-gated. */
export default async function CheckinPage({
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
        title="Morning check-in"
        message="Check-ins open once the cohort start date is set."
      />
    );
  }
  const state = getPhase(startDate, localDate).state;

  if (state === 'pre' || state === 'complete') {
    return (
      <ClosedNotice
        title="Morning check-in"
        message={
          state === 'pre'
            ? 'Check-ins open on day one of the protocol. Nothing to log yet.'
            : 'The protocol is complete. Check-ins are closed and your entries are locked.'
        }
      />
    );
  }

  // Only ever looks up *today's* row (matched on member + today's localDate),
  // so this is the one and only checkin that can be edited from this page.
  const [existing] = await db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6" data-surface="dark">
      <div className="flex items-baseline justify-between">
        <h1 className="text-h2 font-bold tracking-[-0.02em] uppercase">Morning check-in</h1>
        <span className="text-2xs font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">~20s</span>
      </div>
      <p className="mt-1 text-xs text-wi-on-dark-2">
        {shortDate(localDate)} · {checkinPhaseLabel(state)}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {error && (
          <p role="alert" className="text-sm text-wi-paper">
            {error === 'sleep'
              ? 'Sleep needs a time like 7:30.'
              : 'Please fill in every field before saving.'}
          </p>
        )}

        <CheckinForm action={saveCheckinAction.bind(null, localDate)} existing={existing} />
      </div>
    </div>
  );
}
