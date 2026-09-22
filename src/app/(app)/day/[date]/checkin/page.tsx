import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/db/client';
import { dailyCheckins } from '@/db/schema';
import { formatDate, phaseLabel } from '@/lib/history';
import { ClosedNotice } from '@/components/ClosedNotice';
import { CheckinForm } from '@/components/CheckinForm';
import { saveCheckinAction } from '../../../checkin/actions';
import { loadDayScreen } from '../guard';

/** The morning check-in for one earlier day: backfilling a missed morning and
 *  correcting an old one are the same form and the same upsert. Saving returns
 *  to the day hub, where the Sessions card shows whether that day still needs one. */
export default async function DayCheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { date } = await params;
  const { error } = await searchParams;
  const screen = await loadDayScreen(date);

  if (screen.closed) {
    return (
      <ClosedNotice
        title="Check-in"
        message={
          screen.closed === 'no-start'
            ? 'Check-ins open once the cohort start date is set.'
            : screen.closed === 'pre'
              ? 'The protocol has not started yet. Nothing to log.'
              : 'The protocol is complete. Your entries are locked.'
        }
      />
    );
  }

  const { member, localDate, phase } = screen;

  const [existing] = await db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)))
    .limit(1);

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6" data-surface="dark">
      <Link
        href={`/day/${localDate}`}
        className="inline-flex items-center gap-1 text-2xs font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase"
      >
        <ChevronLeft className="size-3" />
        {formatDate(localDate)}
      </Link>

      <h1 className="mt-2 text-h2 font-bold tracking-[-0.02em] uppercase">Morning check-in</h1>
      <p className="mt-1 text-xs text-wi-on-dark-2">
        {formatDate(localDate)} · {phaseLabel(phase)}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {error && (
          <p role="alert" className="text-sm text-wi-paper">
            {error === 'sleep' ? 'Sleep needs a time like 7:30.' : 'Please fill in every field before saving.'}
          </p>
        )}

        <CheckinForm action={saveCheckinAction.bind(null, localDate)} existing={existing} />
      </div>
    </div>
  );
}
