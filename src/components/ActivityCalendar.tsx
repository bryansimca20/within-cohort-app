'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { ChevronRight, Droplet } from 'lucide-react';
import type { ActivityDay, MemberActivity } from '@/lib/activity';
import { formatDate, isLateEntry, phaseLabel, servingsLabel, sessionTypeLabel } from '@/lib/history';
import { formatHhMm } from '@/lib/duration';
import { trimTrailingZeros } from '@/lib/decimal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Sessions drawn as dots before the cell runs out of room. */
const MAX_DOTS = 3;

const eyebrow = 'text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500';

function count(n: number, noun: string): string {
  if (n === 0) return `no ${noun}s`;
  return n === 1 ? `1 ${noun}` : `${n} ${noun}s`;
}

function dayName(day: ActivityDay): string {
  const parts = [day.checkin ? 'checked in' : 'no check-in', count(day.sessions.length, 'session')];
  if (day.servings !== null) parts.push(count(day.servings, 'serving'));
  return `${formatDate(day.localDate)}: ${parts.join(', ')}`;
}

function lastCheckinLabel(member: MemberActivity): string {
  if (member.lastCheckinDate === null) return 'No check-ins yet';
  if (member.daysQuiet === 0) return 'Last check-in today';
  if (member.daysQuiet === 1) return 'Last check-in yesterday';
  return `Last check-in ${member.daysQuiet} days ago`;
}

/**
 * One member's whole protocol as a week-row calendar: filled is a check-in,
 * dots are sessions, the droplet count is servings. Tapping a day opens what
 * was logged underneath; a mouse previews it on hover. One mechanism covers
 * both because a tooltip has no touch equivalent.
 */
export function ActivityCalendar({
  member,
  startDate,
  totalDays,
}: {
  member: MemberActivity;
  startDate: string;
  totalDays: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const shownDate = hovered ?? selected;
  const shown = member.days.find((d) => d.localDate === shownDate);

  const start = parseISO(startDate);
  // Monday-first column of day 0, so every row is a calendar week.
  const leading = (start.getDay() + 6) % 7;
  const upcoming = Array.from({ length: Math.max(totalDays - member.days.length, 0) }, (_, i) =>
    format(addDays(start, member.days.length + i), 'd'),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link href={`/admin/member/${member.id}`} className="flex min-w-0 items-center gap-1 text-sm font-semibold text-wi-black">
              <span className="truncate">{member.name}</span>
              <ChevronRight className="size-3.5 shrink-0" />
            </Link>
            <Badge variant={member.checkedInToday ? 'default' : 'outline'}>
              {member.checkedInToday ? 'Checked in' : 'Not yet'}
            </Badge>
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-wi-ink-500">
            <span>
              Check-ins {member.checkinCount} / {member.days.length}
            </span>
            <span>{lastCheckinLabel(member)}</span>
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-bold text-wi-ink-300 uppercase">
              <span aria-hidden>{w[0]}</span>
              <span className="sr-only">{w}</span>
            </div>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {member.days.map((day) => {
            const isSelected = selected === day.localDate;
            return (
              <button
                key={day.localDate}
                type="button"
                aria-label={dayName(day)}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : day.localDate)}
                // Mouse only: a tap also fires pointerenter but never a
                // matching leave, which would pin the preview open.
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHovered(day.localDate);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse') setHovered(null);
                }}
                className={cn(
                  'flex aspect-square min-w-0 flex-col justify-between rounded-[6px] border p-1 text-left text-[10px] leading-none font-bold outline-none focus-visible:ring-2 focus-visible:ring-wi-black focus-visible:ring-offset-2',
                  day.checkin ? 'border-wi-black bg-wi-black text-wi-paper' : 'border-wi-line bg-wi-paper text-wi-black',
                  isSelected && 'ring-2 ring-wi-black ring-offset-2',
                )}
              >
                <span className={cn('font-medium', day.checkin ? 'text-wi-on-dark-2' : 'text-wi-ink-500')}>
                  {Number(day.localDate.slice(8))}
                </span>
                <span className="flex items-center justify-between gap-0.5">
                  <span className="flex gap-0.5">
                    {day.sessions.slice(0, MAX_DOTS).map((s) => (
                      <span key={s.id} className="size-1 rounded-full bg-current" />
                    ))}
                  </span>
                  {day.servings !== null && (
                    <span className="flex items-center">
                      <Droplet className="size-2" />
                      {day.servings}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {upcoming.map((dayNum, i) => (
            <div
              key={`upcoming-${i}`}
              className="aspect-square rounded-[6px] bg-wi-paper-dim p-1 text-[10px] leading-none font-medium text-wi-ink-300"
            >
              {dayNum}
            </div>
          ))}
        </div>

        <div aria-live="polite" className="border-t border-wi-line pt-3">
          {shown ? <DayDetail day={shown} /> : <p className="text-xs text-wi-ink-300">Tap a day to see what was logged.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DayDetail({ day }: { day: ActivityDay }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-wi-black">{formatDate(day.localDate)}</p>
        <Badge variant="outline">{phaseLabel(day.phase)}</Badge>
      </div>

      {!day.logged ? (
        <p className="text-sm text-wi-ink-300">Not logged</p>
      ) : (
        <>
          <div>
            <p className={eyebrow}>
              Check-in
              {day.checkin && isLateEntry(day.localDate, day.checkin.createdAt) && (
                <span className="ml-2 normal-case text-wi-ink-300">logged late</span>
              )}
            </p>
            {day.checkin ? (
              <p className="mt-1 text-sm leading-relaxed text-wi-black">
                Recovery {day.checkin.recovery} · RHR {day.checkin.restingHr}
                {day.checkin.hrvMs !== null && <> · HRV {day.checkin.hrvMs} ms</>} · Sleep{' '}
                {formatHhMm(day.checkin.sleepMinutes)}
                <br />
                Hooper: Sleep {day.checkin.hooperSleep}, Fatigue {day.checkin.hooperFatigue}, Soreness{' '}
                {day.checkin.hooperSoreness}, Stress {day.checkin.hooperStress}
                {day.checkin.note ? (
                  <>
                    <br />
                    Note: {day.checkin.note}
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-wi-ink-300">No check-in</p>
            )}
          </div>

          <div>
            <p className={eyebrow}>Sessions</p>
            {day.sessions.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1.5 text-sm text-wi-black">
                {day.sessions.map((s) => (
                  <li key={s.id}>
                    {sessionTypeLabel(s)} · RPE {s.rpe} · {s.durationMin} min · {trimTrailingZeros(s.distanceKm)} km
                    {s.servings ? ` · ${servingsLabel(s.servings)}` : ''}
                    {s.note ? ` · ${s.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-wi-ink-300">No sessions</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
