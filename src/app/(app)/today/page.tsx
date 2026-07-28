import Link from 'next/link';
import { Activity, Check, Pencil, Sunrise, Zap } from 'lucide-react';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getCohortStartDate } from '@/lib/cohort';
import { getTodayStatus, type TodayStatus } from '@/lib/today';
import { logout } from '@/app/login/actions';
import { WithinLogo } from '@/components/brand/WithinLogo';
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

/** First letter of up to the first two words of a name, uppercased, for the logout avatar tile. */
function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Ledger cell fill: solid for already-logged days, an outlined ring on the active phase's next slot while it's still unlogged today, faint for the rest. */
function ledgerCellClass(index: number, loggedCount: number, isActivePhase: boolean, checkinDone: boolean): string {
  if (index < loggedCount) return 'bg-wi-paper';
  if (isActivePhase && !checkinDone && index === loggedCount) return 'bg-transparent border-[1.5px] border-wi-paper';
  return 'bg-wi-on-dark-fill';
}

/** One 7-wide ledger strip: a label row ("Baseline" / "logged / total") over a grid of day cells. */
function Ledger({
  label,
  total,
  logged,
  isActivePhase,
  checkinDone,
}: {
  label: string;
  total: number;
  logged: number;
  isActivePhase: boolean;
  checkinDone: boolean;
}) {
  return (
    <div className="mt-[22px]">
      <div className="flex items-center justify-between border-b border-wi-on-dark-line pb-2">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase whitespace-nowrap">{label}</span>
        <span className="text-[10px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">
          {logged} / {total} logged
        </span>
      </div>
      <div className="mt-[10px] grid grid-cols-7 gap-[6px]">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn('h-[26px] rounded-[3px]', ledgerCellClass(i, logged, isActivePhase, checkinDone))}
          />
        ))}
      </div>
    </div>
  );
}

/** The phase eyebrow + big counter (or the pre/complete message in its place). */
function PhaseSummary({ status, startDate }: { status: TodayStatus; startDate: string }) {
  if (status.phaseState === 'pre') {
    return (
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">Before the protocol</p>
        <p className="mt-2 text-[28px] leading-[1.15] font-bold tracking-[-0.02em]">
          Starts {formatCohortStart(startDate)}
        </p>
      </div>
    );
  }

  if (status.phaseState === 'complete') {
    return (
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">Six weeks, logged</p>
        <p className="mt-2 text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">Protocol complete</p>
      </div>
    );
  }

  const isBaseline = status.phaseState === 'baseline';
  const dayNumber = isBaseline ? status.dayIndex + 1 : status.dayIndex - 13;
  const totalDays = isBaseline ? 14 : 28;

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">
        {isBaseline ? 'Baseline · no product' : 'Within · one sachet daily'}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[62px] leading-none font-bold tracking-[-0.045em]">{dayNumber}</span>
        <span className="text-lg font-bold text-wi-on-dark-3">/ {totalDays}</span>
      </div>
      <p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-wi-on-dark-2 uppercase">
        Days into the protocol
      </p>
    </div>
  );
}

/** Full-black Today home screen: phase-day progress, baseline/within ledgers, check-in status, and the check-in/session actions. */
export default async function TodayPage() {
  const member = await requireMember();
  const startDate = getCohortStartDate();
  const status = await getTodayStatus(db, member, new Date(), startDate);
  const initials = initialsOf(member.name);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-wi-black text-wi-paper">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pt-2 pb-6">
        <div className="flex items-center justify-between pt-1.5">
          <WithinLogo color="white" height={13} />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Log out"
              className="flex size-[34px] items-center justify-center rounded-lg border border-wi-on-dark-line text-xs font-bold"
            >
              {initials}
            </button>
          </form>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <PhaseSummary status={status} startDate={startDate} />
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Zap className="size-5" />
              <span className="text-[30px] leading-none font-bold">{status.streak}</span>
            </div>
            <p className="mt-[3px] text-[10px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">Streak</p>
          </div>
        </div>

        <Ledger
          label="Baseline"
          total={14}
          logged={status.baselineLogged}
          isActivePhase={status.phaseState === 'baseline'}
          checkinDone={status.checkinDone}
        />
        <Ledger
          label="Within"
          total={28}
          logged={status.withinLogged}
          isActivePhase={status.phaseState === 'within'}
          checkinDone={status.checkinDone}
        />

        <div className="mt-5 border-t border-wi-on-dark-line">
          <div className="flex items-center gap-3 border-b border-wi-on-dark-line py-3">
            {status.checkinDone ? (
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-wi-paper text-wi-black">
                <Check className="size-4" />
              </span>
            ) : (
              <span className="size-[30px] shrink-0 rounded-lg border border-dashed border-wi-on-dark-3" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {status.checkinDone ? 'Today is logged' : 'Today is not logged yet'}
              </p>
              <p className="mt-0.5 text-xs text-wi-on-dark-3">
                {status.checkinDone ? 'Logged · editable today' : 'About 20 seconds'}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex h-[22px] items-center rounded-[5px] px-[9px] text-[10px] font-bold tracking-[0.1em] whitespace-nowrap uppercase',
                status.checkinDone ? 'bg-wi-paper text-wi-black' : 'border border-wi-on-dark-3 text-wi-paper'
              )}
            >
              {status.checkinDone ? 'Done' : 'Not yet'}
            </span>
          </div>
          <div className="flex items-center gap-3 py-3">
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-wi-on-dark-fill">
              <Activity className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sessions today</p>
              <p className="mt-0.5 text-xs text-wi-on-dark-3">Log after a long or hard run</p>
            </div>
            <span className="text-base font-bold">{status.sessionCount}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-[10px]">
          <Link
            href="/checkin"
            className={cn(
              'flex h-[78px] flex-col items-center justify-center gap-2 rounded-[8px] text-center text-[11px] font-bold tracking-[0.05em] uppercase',
              status.checkinDone
                ? 'border-[1.5px] border-wi-on-dark-3 text-wi-paper'
                : 'bg-wi-paper text-wi-black'
            )}
          >
            {status.checkinDone ? <Pencil className="size-5" /> : <Sunrise className="size-5" />}
            {status.checkinDone ? 'Edit check-in' : 'Morning check-in'}
          </Link>
          <Link
            href="/session"
            className="flex h-[78px] flex-col items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-wi-on-dark-3 text-center text-[11px] font-bold tracking-[0.05em] text-wi-paper uppercase"
          >
            <Activity className="size-5" />
            Log session
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <InstallCard />
          <EnablePush />
        </div>
      </div>
    </div>
  );
}
