import Link from 'next/link';
import { Activity, Check, Clock, Pencil, Sunrise, Zap } from 'lucide-react';
import { db } from '@/db/client';
import { requireMember } from '@/lib/session';
import { getCohortStartDateOrNull } from '@/lib/cohort';
import { getTodayStatus, type TodayStatus } from '@/lib/today';
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
      {/* Bottom clearance must include env(safe-area-inset-bottom): the fixed nav grows
          by that inset in the installed PWA, so a plain pb-[92px] lets the action buttons
          crowd the nav on iOS (fine in the browser, where the inset is 0). */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pb-[calc(92px+env(safe-area-inset-bottom))]">
        {children}
      </div>
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
        eyebrow="Four weeks, logged"
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

      <div className="mt-auto flex flex-col gap-[10px] pt-5">
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
