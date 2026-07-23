import Link from 'next/link';
import { CheckCircle2Icon, FlameIcon, FootprintsIcon, SunriseIcon } from 'lucide-react';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getTodayStatus, type TodayStatus } from '@/lib/today';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InstallCard } from '@/components/InstallCard';
import { EnablePush } from '@/components/EnablePush';
import { cn } from '@/lib/utils';

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
        <p className="text-xs uppercase tracking-[0.2em] text-wi-ink-500">Hi {member.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-wi-black">{badge}</h1>
      </div>

      <Card>
        <CardContent>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-wi-ink-500">
                {status.checkinDone && <CheckCircle2Icon className="size-4 text-wi-black" />}
                Morning check-in
              </dt>
              <dd className="font-medium text-wi-black">{status.checkinDone ? 'Done' : 'Not yet'}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-wi-line pt-3">
              <dt className="text-wi-ink-500">Sessions logged today</dt>
              <dd className="font-medium text-wi-black">{status.sessionCount}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-wi-line pt-3">
              <dt className="flex items-center gap-2 text-wi-ink-500">
                <FlameIcon className="size-4 text-wi-black" />
                Streak
              </dt>
              <dd className="font-medium text-wi-black">{status.streak} day streak</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Link
          href="/checkin"
          className={cn(buttonVariants({ size: 'lg' }), 'h-auto py-5 text-base normal-case tracking-normal')}
        >
          <SunriseIcon />
          Morning check-in
        </Link>
        <Link
          href="/session"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'lg' }),
            'h-auto py-5 text-base normal-case tracking-normal'
          )}
        >
          <FootprintsIcon />
          Log a session
        </Link>
      </div>

      <InstallCard />
      <EnablePush />
    </div>
  );
}
