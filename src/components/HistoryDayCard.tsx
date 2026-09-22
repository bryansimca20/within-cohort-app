'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Pencil, Plus } from 'lucide-react';
import { formatHhMm } from '@/lib/duration';
import { isLateEntry, servingsLabel, sessionTypeLabel, type DayGroup } from '@/lib/history';
import { cn } from '@/lib/utils';
import { splitLocalDate } from '@/lib/dayLabel';
import { SessionRowActions } from '@/components/SessionRowActions';
import { trimTrailingZeros } from '@/lib/decimal';

/** One expandable History row, styled for the black History screen: collapsed shows the date, phase tag, and session count; expanded reveals check-in, Hooper, and per-session detail, plus an edit link when it's today's entry. */
export function HistoryDayCard({ day, isToday, editable }: { day: DayGroup; isToday: boolean; editable: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { dayNum, weekday } = splitLocalDate(day.localDate);
  const isWithin = day.phase === 'within';
  const sessionSummary =
    day.sessions.length > 0
      ? `${day.sessions.length} session${day.sessions.length === 1 ? '' : 's'}`
      : 'Check-in only · no session';

  return (
    <div className="rounded-lg border border-wi-on-dark-line">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-[14px] text-left transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.99]"
      >
        <div className="w-[42px] shrink-0 text-center">
          <div className="text-lg leading-none font-bold text-wi-paper">{dayNum}</div>
          <div className="mt-0.5 text-[10px] font-bold tracking-[0.06em] text-wi-on-dark-3 uppercase">{weekday}</div>
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-flex h-[18px] items-center rounded-[4px] px-[7px] text-[10px] font-bold tracking-[0.1em] uppercase leading-none',
              isWithin ? 'bg-wi-paper text-wi-black' : 'bg-wi-on-dark-fill text-wi-on-dark-2'
            )}
          >
            {isWithin ? 'Within' : 'Baseline'}
          </span>
          <p className="mt-[5px] text-xs text-wi-on-dark-2">{sessionSummary}</p>
        </div>
        <ChevronRight
          className={cn('size-4 shrink-0 text-wi-on-dark-3 transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-wi-on-dark-line px-[14px] pt-3 pb-[14px] pl-[69px] animate-wi-expand">
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">
              Check-in
              {day.checkin && isLateEntry(day.localDate, day.checkin.createdAt) && (
                <span className="ml-2 font-bold text-wi-on-dark-3 normal-case">logged late</span>
              )}
            </p>
            {day.checkin ? (
              <>
                <p className="mt-1 text-[13px] text-wi-on-dark-1">
                  Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr}
                  {day.checkin.hrvMs !== null && <> · HRV {day.checkin.hrvMs} ms</>} · Sleep{' '}
                  {formatHhMm(day.checkin.sleepMinutes)}
                </p>
                <p className="mt-0.5 text-[13px] text-wi-on-dark-1">
                  Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                  {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-wi-on-dark-3">No check-in</p>
            )}
            {editable && (
              <Link
                href={isToday ? '/checkin' : `/day/${day.localDate}/checkin`}
                className="mt-1.5 inline-flex items-center gap-1 self-start text-[11px] font-bold tracking-[0.06em] text-wi-paper uppercase"
              >
                {day.checkin ? <Pencil className="size-3" /> : <Plus className="size-3" />}
                {day.checkin ? 'Edit check-in' : 'Add check-in'}
              </Link>
            )}
          </div>

          {day.sessions.map((s) => (
            <div key={s.id}>
              <p className="text-[11px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">Session</p>
              <p className="mt-1 text-[13px] text-wi-on-dark-1">
                {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {trimTrailingZeros(s.distanceKm)} km
                {s.servings ? ` · ${servingsLabel(s.servings)}` : ''}
              </p>
              {editable && <SessionRowActions sessionId={s.id} from="history" />}
            </div>
          ))}

          {/* A day that was checked into but never had its session logged is the
              case this affordance exists for: without a labelled link, the only
              way in was the check-in's Edit link, which reads as the wrong door. */}
          {editable && (
            <Link
              href={isToday ? '/session' : `/day/${day.localDate}/session`}
              className="inline-flex items-center gap-1 self-start text-[11px] font-bold tracking-[0.06em] text-wi-paper uppercase"
            >
              <Plus className="size-3" />
              Add session
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
