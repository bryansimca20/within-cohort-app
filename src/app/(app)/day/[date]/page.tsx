import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { formatDate, phaseLabel } from '@/lib/history';
import { formatHhMm } from '@/lib/duration';
import { cn } from '@/lib/utils';
import { ClosedNotice } from '@/components/ClosedNotice';
import { loadDayScreen } from './guard';

/** One card on the day hub: what this part of the day holds, and whether it is
 *  logged yet. An empty part carries the full-white to-do border, which is the
 *  whole reason the hub exists: after saving a check-in the member lands here
 *  and sees, without scrolling, that the day still has no session on it. */
function DayCard({ href, title, summary, done }: { href: string; title: string; summary: string; done: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg p-[14px] transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.99]',
        done ? 'border border-wi-on-dark-line' : 'border-[1.5px] border-wi-paper',
      )}
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[6px] border border-wi-on-dark-line">
        {done ? <Check className="size-4 text-wi-on-dark-2" /> : <Plus className="size-4 text-wi-paper" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold tracking-[0.06em] text-wi-paper uppercase">{title}</span>
        <span className="mt-[3px] block text-[11px] text-wi-on-dark-2">{summary}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-wi-on-dark-3" />
    </Link>
  );
}

/** The hub for one earlier calendar day: a card per thing that day can hold,
 *  each opening its own focused screen. Reached from a History row. Today is
 *  redirected to its own capture screens by the shared guard. */
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const screen = await loadDayScreen(date);

  if (screen.closed) {
    return (
      <ClosedNotice
        title="Log a day"
        message={
          screen.closed === 'no-start'
            ? 'Logging opens once the cohort start date is set.'
            : screen.closed === 'pre'
              ? 'The protocol has not started yet. Nothing to log.'
              : 'The protocol is complete. Your entries are locked and no day can be logged.'
        }
      />
    );
  }

  const { member, localDate, phase } = screen;

  const [checkin] = await db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)))
    .limit(1);

  const sessions = await db
    .select({ id: sessionLogs.id })
    .from(sessionLogs)
    .where(and(eq(sessionLogs.memberId, member.id), eq(sessionLogs.localDate, localDate)));

  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6" data-surface="dark">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-2xs font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase"
      >
        <ChevronLeft className="size-3" />
        History
      </Link>

      <h1 className="mt-2 text-h2 font-bold tracking-[-0.02em] uppercase">{formatDate(localDate)}</h1>
      <p className="mt-1 text-xs text-wi-on-dark-2">{phaseLabel(phase)}</p>

      <div className="mt-6 flex flex-col gap-[10px]">
        <DayCard
          href={`/day/${localDate}/checkin`}
          title="Morning check-in"
          done={Boolean(checkin)}
          summary={
            checkin
              ? `Recovery ${checkin.recovery} · RHR ${checkin.restingHr} · Sleep ${formatHhMm(checkin.sleepMinutes)}`
              : 'Not logged'
          }
        />
        <DayCard
          href={`/day/${localDate}/session`}
          title="Sessions"
          done={sessions.length > 0}
          summary={
            sessions.length > 0
              ? `${sessions.length} logged`
              : 'None logged. Rest days need no entry.'
          }
        />
      </div>

      <Link
        href="/history"
        className="mt-6 flex h-11 w-full items-center justify-center rounded-[6px] border border-wi-on-dark-line text-2xs font-bold tracking-[0.1em] text-wi-on-dark-2 uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.98]"
      >
        Done
      </Link>
    </div>
  );
}
