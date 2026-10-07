import Link from 'next/link';
import { Activity, Check, Clock, Pencil, Sunrise, X, Zap } from 'lucide-react';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getCohortStartDateOrNull } from '@/lib/cohort';
import { getTodayStatus, type LedgerCell, type TodayStatus } from '@/lib/today';
import { formatDate } from '@/lib/history';
import { phaseProgress } from '@/lib/phase';
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

const cellBase = 'h-5 rounded-[3px]';

/** One ledger day: solid when logged, a ring while today is still open, faint when upcoming, and a crossed cell linking to the backfill screen when missed. */
function LedgerDayCell({ cell }: { cell: LedgerCell }) {
  if (cell.state === 'missed') {
    return (
      <Link
        href={`/day/${cell.localDate}`}
        aria-label={`${formatDate(cell.localDate)}: not logged. Log this day`}
        className={cn(cellBase, 'flex items-center justify-center border border-wi-on-dark-3 text-wi-paper')}
      >
        <X className="size-3" strokeWidth={2.5} />
      </Link>
    );
  }
  return (
    <div
      className={cn(
        cellBase,
        cell.state === 'logged' && 'bg-wi-paper',
        cell.state === 'today' && 'border-[1.5px] border-wi-paper',
        cell.state === 'upcoming' && 'bg-wi-on-dark-fill',
      )}
    />
  );
}

/** One ledger strip: a label row ("Baseline" / "logged / total") over a grid with one cell per protocol day. */
function Ledger({ label, days }: { label: string; days: LedgerCell[] }) {
  const logged = days.filter((d) => d.state === 'logged').length;
  const missed = days.filter((d) => d.state === 'missed').length;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between border-b border-wi-on-dark-line pb-2">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase whitespace-nowrap">{label}</span>
        <span className="text-[10px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">
          {logged} / {days.length} logged
          {missed > 0 && <span className="text-wi-paper"> · {missed} missed</span>}
        </span>
      </div>
      <div className="mt-[10px] grid grid-cols-14 gap-[4px]">
        {days.map((cell) => (
          <LedgerDayCell key={cell.localDate} cell={cell} />
        ))}
      </div>
    </div>
  );
}

/** The phase eyebrow + big day counter. Baseline runs 14 days, Within 28. */
function PhaseCounter({ status }: { status: TodayStatus }) {
  const isBaseline = status.phaseState === 'baseline';
  const { day, total } = phaseProgress(isBaseline ? 'baseline' : 'within', status.dayIndex);

  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">
        {isBaseline ? 'Baseline · no product' : 'Within · one sachet daily'}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[62px] leading-none font-bold tracking-[-0.045em]">{day}</span>
        <span className="text-lg font-bold text-wi-on-dark-3">/ {total}</span>
      </div>
      <p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-wi-on-dark-2 uppercase">Days into the protocol</p>
    </div>
  );
}

/** The full-black shell every Today variant sits in (below the shared header): fills its space, never scrolls. */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* pb-5 is just breathing room above the in-flow nav; the nav owns the home-indicator
          inset itself, so this no longer has to reserve nav height. */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pb-5">{children}</div>
    </div>
  );
}

/** The mockup-style greeting heading. */
function Welcome({ name }: { name: string }) {
  return <h1 className="text-[26px] font-bold tracking-[-0.02em] text-wi-paper pt-4">Welcome, {name}</h1>;
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
  const name = member.name;
  const startDate = await getCohortStartDateOrNull(db);

  if (!startDate) {
    return (
      <ClosedScreen
        name={name}
        eyebrow="Cohort not open"
        headline="Not scheduled yet"
        body="The cohort start date isn't set yet. Check back once it's scheduled."
      />
    );
  }

  const status = await getTodayStatus(db, member, new Date(), startDate);

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
        eyebrow="Six weeks, logged"
        headline="Protocol complete"
        body="Logging is closed and every entry is locked. Your history stays available to review."
        action={
          <Link
            href="/history"
            className="inline-flex h-[46px] items-center rounded-[8px] bg-wi-paper px-6 text-[11px] font-bold tracking-[0.08em] text-wi-black uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.97]"
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

      <Ledger label="Baseline" days={status.baselineDays} />
      <Ledger label="Within" days={status.withinDays} />

      <div className="mt-4 border-t border-wi-on-dark-line">
        <div className="flex items-center gap-3 border-b border-wi-on-dark-line py-2.5">
          {status.checkinDone ? (
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-wi-paper text-wi-black">
              <Check className="size-4" />
            </span>
          ) : (
            <span className="size-[30px] shrink-0 rounded-lg border border-dashed border-wi-on-dark-3" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {status.checkinDone ? "You've logged in today" : 'Today is not logged yet'}
            </p>
            <p className="mt-0.5 text-xs text-wi-on-dark-3">
              {status.checkinDone ? 'Logged · editable today' : 'About 20 seconds'}
            </p>
          </div>
          {status.checkinDone ? (
            <Link
              href="/checkin"
              aria-label="Edit today's check-in"
              className="inline-flex h-[22px] items-center gap-1 rounded-[5px] bg-wi-paper px-[9px] text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-wi-black uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.95]"
            >
              <Pencil className="size-3" />
              Edit
            </Link>
          ) : (
            <span className="inline-flex h-[22px] items-center rounded-[5px] border border-wi-on-dark-3 px-[9px] text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-wi-paper uppercase">
              Not yet
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 py-2.5">
          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-wi-on-dark-fill">
            <Activity className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Sessions today</p>
            <p className="mt-0.5 text-xs text-wi-on-dark-3">Log after every session</p>
          </div>
          <span className="text-base font-bold">{status.sessionCount}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-[10px] pt-4">
        {/* Discoverable reminder opt-in. Web Push is opt-in per device, and the
            only other entry point is buried at the bottom of History, so runners
            never found it. showWhenOn={false} keeps this a pure nudge: it renders
            only while reminders are off, then returns null (no DOM node, no gap)
            once granted, so it never permanently costs this fixed screen space. */}
        <EnablePush showWhenOn={false} />
        <div className="grid grid-cols-2 gap-[10px]">
          <Link
            href="/checkin"
            className={cn(
              'flex h-[74px] flex-col items-center justify-center gap-2 rounded-[8px] text-center text-[11px] font-bold tracking-[0.05em] uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.97]',
              status.checkinDone ? 'border-[1.5px] border-wi-on-dark-3 text-wi-paper' : 'bg-wi-paper text-wi-black'
            )}
          >
            {status.checkinDone ? <Pencil className="size-5" /> : <Sunrise className="size-5" />}
            {status.checkinDone ? 'Edit check-in' : 'Morning check-in'}
          </Link>
          <Link
            href="/session"
            className="flex h-[74px] flex-col items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-wi-on-dark-3 text-center text-[11px] font-bold tracking-[0.05em] text-wi-paper uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.97]"
          >
            <Activity className="size-5" />
            {status.sessionCount > 0 ? 'Log another session' : 'Log session'}
          </Link>
        </div>
      </div>
    </Screen>
  );
}
