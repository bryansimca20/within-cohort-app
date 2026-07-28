'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Pencil } from 'lucide-react';
import { sessionTypeLabel, type DayGroup } from '@/lib/history';
import { cn } from '@/lib/utils';

// Day-number + weekday split for the collapsed row. 'YYYY-MM-DD' is a plain
// calendar date with no time component, so parsing/formatting stays pinned
// to UTC end to end, same as formatDate in lib/history.
function splitLocalDate(dateISO: string): { dayNum: string; weekday: string } {
  const date = new Date(dateISO);
  return {
    dayNum: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  };
}

/** One expandable History row: collapsed shows the date, phase tag, and session count; expanded reveals check-in, Hooper, and per-session detail, plus an edit link when it's today's entry. */
export function HistoryDayCard({ day, isToday }: { day: DayGroup; isToday: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { dayNum, weekday } = splitLocalDate(day.localDate);
  const isWithin = day.phase === 'within';
  const sessionSummary =
    day.sessions.length > 0
      ? `${day.sessions.length} session${day.sessions.length === 1 ? '' : 's'}`
      : 'Check-in only · no session';

  return (
    <div className="rounded-lg border border-wi-line bg-wi-paper">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-[14px] text-left"
      >
        <div className="w-[42px] shrink-0 text-center">
          <div className="text-lg leading-none font-bold text-wi-black">{dayNum}</div>
          <div className="mt-0.5 text-[10px] font-bold tracking-[0.06em] text-wi-ink-300 uppercase">{weekday}</div>
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-flex h-[18px] items-center rounded-[4px] px-[7px] text-[10px] font-bold tracking-[0.1em] uppercase leading-none',
              isWithin ? 'bg-wi-black text-wi-paper' : 'bg-wi-mist text-wi-black'
            )}
          >
            {isWithin ? 'Within' : 'Baseline'}
          </span>
          <p className="mt-[5px] text-xs text-wi-black">{sessionSummary}</p>
        </div>
        <ChevronRight
          className={cn('size-4 shrink-0 text-wi-ink-300 transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-wi-line px-[14px] pt-3 pb-[14px] pl-[69px]">
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-wi-ink-300 uppercase">Check-in</p>
            {day.checkin ? (
              <>
                <p className="mt-1 text-[13px] text-wi-black">
                  Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr} · Sleep {day.checkin.sleepHours}h
                </p>
                <p className="mt-0.5 text-[13px] text-wi-black">
                  Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                  {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-wi-ink-300">No check-in</p>
            )}
          </div>

          {day.sessions.map((s) => (
            <div key={s.id}>
              <p className="text-[11px] font-bold tracking-[0.1em] text-wi-ink-300 uppercase">Session</p>
              <p className="mt-1 text-[13px] text-wi-black">
                {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {s.distanceKm} km
                {s.tookServing ? ' · serving taken' : ''}
              </p>
            </div>
          ))}

          {isToday && (
            <Link
              href="/checkin"
              className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold tracking-[0.06em] text-wi-black uppercase"
            >
              <Pencil className="size-3" />
              Editable today
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
