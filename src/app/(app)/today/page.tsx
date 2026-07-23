import Link from 'next/link';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getTodayStatus, type TodayStatus } from '@/lib/today';

// 'YYYY-MM-DD' is a plain calendar date with no time component; parsing it
// and re-formatting it must stay pinned to UTC end to end, otherwise a
// negative-offset server timezone (or a browser's local zone) can roll the
// displayed date back a day.
function formatCohortStart(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function badgeCopy(status: TodayStatus, cohortStartDate: string | null): string {
  if (status.phaseState === 'pre') {
    return cohortStartDate ? `Starts ${formatCohortStart(cohortStartDate)}` : 'Not started';
  }
  if (status.phaseState === 'baseline') {
    return `Baseline · Day ${status.dayIndex + 1} / 14`;
  }
  if (status.phaseState === 'within') {
    return `On Within · Day ${status.dayIndex - 13} / 28`;
  }
  return 'Protocol complete';
}

export default async function TodayPage() {
  const member = await requireMember();
  const status = await getTodayStatus(db, member, new Date());
  const badge = badgeCopy(status, member.cohortStartDate);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] opacity-50">Hi {member.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">{badge}</h1>
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="opacity-70">Morning check-in</dt>
            <dd className="font-medium">{status.checkinDone ? 'Done' : 'Not yet'}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
            <dt className="opacity-70">Sessions logged today</dt>
            <dd className="font-medium">{status.sessionCount}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
            <dt className="opacity-70">Streak</dt>
            <dd className="font-medium">{status.streak} day streak</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/checkin"
          className="flex items-center justify-center rounded-[6px] bg-black px-6 py-5 text-base font-semibold text-white dark:bg-white dark:text-black"
        >
          Morning check-in
        </Link>
        <Link
          href="/session"
          className="flex items-center justify-center rounded-[6px] border border-black/20 px-6 py-5 text-base font-semibold text-black dark:border-white/20 dark:text-white"
        >
          Log a session
        </Link>
      </div>

      {/* InstallCard mounts here (Task D1) */}
    </div>
  );
}
