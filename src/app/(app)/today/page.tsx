import Link from 'next/link';
import { Activity, Check, Clock, Pencil, Sunrise, Zap } from 'lucide-react';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getCohortStartDate } from '@/lib/cohort';
import { getTodayStatus, type TodayStatus } from '@/lib/today';
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

/** Ledger cell fill: solid for already-logged days, an outlined ring on the active phase's next slot while it's still unlogged today, faint for the rest. */
// Renders a count-based progress bar (fill order tracks how many are logged), not a per-calendar-day map.
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
    <div className="mt-[18px]">
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

/** The phase eyebrow + big day counter. Baseline and within are each 14 days. */
function PhaseCounter({ status }: { status: TodayStatus }) {
  const isBaseline = status.phaseState === 'baseline';
  const dayNumber = isBaseline ? status.dayIndex + 1 : status.dayIndex - 13;

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">
        {isBaseline ? 'Baseline · no product' : 'Within · one sachet daily'}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[62px] leading-none font-bold tracking-[-0.045em]">{dayNumber}</span>
        <span className="text-lg font-bold text-wi-on-dark-3">/ 14</span>
      </div>
      <p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-wi-on-dark-2 uppercase">Days into the protocol</p>
    </div>
  );
}

/** The full-black shell every Today variant sits in (below the shared header): fills its space, never scrolls. */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pb-[92px]">{children}</div>
    </div>
  );
}

/** The mockup-style greeting heading. */
function Welcome({ name }: { name: string }) {
  return <h1 className="text-[26px] font-bold tracking-[-0.02em] text-wi-paper pt-8">Welcome, {name}</h1>;
}

/** Closed states (before the cohort starts, or after it completes): the greeting over a single calm statement, no empty ledgers or dead buttons. */
function ClosedScreen({
  name,
  eyebrow,
  headline,
  body,
  action,
}: {
  name: string;
  eyebrow: string;
  headline: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Screen>
      <Welcome name={name} />
      <div className="flex flex-1 flex-col justify-center">
        <span className="flex size-11 items-center justify-center rounded-lg border border-wi-on-dark-line">
          <Clock className="size-5 text-wi-on-dark-2" />
        </span>
        <p className="mt-6 text-[11px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">{eyebrow}</p>
        <p className="mt-3 text-[40px] leading-[0.98] font-bold tracking-[-0.03em]">{headline}</p>
        <p className="mt-4 max-w-[20rem] text-sm leading-relaxed text-wi-on-dark-2">{body}</p>
        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    </Screen>
  );
}

/** Full-black Today home screen: the greeting, phase-day progress, baseline/within ledgers, check-in status, and the check-in/session actions. */
export default async function TodayPage() {
  const member = await requireMember();
  const startDate = getCohortStartDate();
  const status = await getTodayStatus(db, member, new Date(), startDate);
  const name = member.name;

  if (status.phaseState === 'pre') {
    return (
      <ClosedScreen
        name={name}
        eyebrow="Before the protocol"
        headline={`Starts ${formatCohortStart(startDate)}`}
        body="Your first morning check-in opens on day one. Nothing to log yet. Keep training as normal."
      />
    );
  }

  if (status.phaseState === 'complete') {
    return (
      <ClosedScreen
        name={name}
        eyebrow="Four weeks, logged"
        headline="Protocol complete"
        body="Logging is closed and every entry is locked. Your history stays available to review."
        action={
          <Link
            href="/history"
            className="inline-flex h-[46px] items-center rounded-[8px] bg-wi-paper px-6 text-[11px] font-bold tracking-[0.08em] text-wi-black uppercase"
          >
            View history
          </Link>
        }
      />
    );
  }

  return (
    <Screen>
      <Welcome name={name} />

      <div className="mt-4 flex items-end justify-between">
        <PhaseCounter status={status} />
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
        total={14}
        logged={status.withinLogged}
        isActivePhase={status.phaseState === 'within'}
        checkinDone={status.checkinDone}
      />

      <div className="mt-4 border-t border-wi-on-dark-line">
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

      <div className="mt-auto grid grid-cols-2 gap-[10px] pt-5">
        <Link
          href="/checkin"
          className={cn(
            'flex h-[74px] flex-col items-center justify-center gap-2 rounded-[8px] text-center text-[11px] font-bold tracking-[0.05em] uppercase',
            status.checkinDone ? 'border-[1.5px] border-wi-on-dark-3 text-wi-paper' : 'bg-wi-paper text-wi-black'
          )}
        >
          {status.checkinDone ? <Pencil className="size-5" /> : <Sunrise className="size-5" />}
          {status.checkinDone ? 'Edit check-in' : 'Morning check-in'}
        </Link>
        <Link
          href="/session"
          className="flex h-[74px] flex-col items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-wi-on-dark-3 text-center text-[11px] font-bold tracking-[0.05em] text-wi-paper uppercase"
        >
          <Activity className="size-5" />
          Log session
        </Link>
      </div>
    </Screen>
  );
}
