import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LedgerDay } from '@/lib/history';
import { splitLocalDate } from '@/lib/dayLabel';

/** A protocol day with nothing logged, on the black History screen. The whole
 *  row is the tap target for logging it. Marked by a full-white border and the
 *  words "Not logged", never by colour: the palette is monochrome and status
 *  carries no hue. Read-only callers (the admin drilldown) pass `actionable`
 *  false and get the same row without the link. */
export function MissedDayRow({
  day,
  actionable = true,
  isToday = false,
}: {
  day: LedgerDay;
  actionable?: boolean;
  isToday?: boolean;
}) {
  const { dayNum, weekday } = splitLocalDate(day.localDate);
  const isWithin = day.phase === 'within';

  const body = (
    <>
      <div className="w-[42px] shrink-0 text-center">
        <div className="text-lg leading-none font-bold text-wi-paper">{dayNum}</div>
        <div className="mt-0.5 text-[10px] font-bold tracking-[0.06em] text-wi-on-dark-3 uppercase">{weekday}</div>
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'inline-flex h-[18px] items-center rounded-[4px] px-[7px] text-[10px] font-bold tracking-[0.1em] uppercase leading-none',
            isWithin ? 'bg-wi-paper text-wi-black' : 'bg-wi-on-dark-fill text-wi-on-dark-2',
          )}
        >
          {isWithin ? 'Within' : 'Baseline'}
        </span>
        <p className="mt-[5px] text-xs text-wi-on-dark-2">Not logged</p>
      </div>
      {actionable && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-wi-paper px-[9px] py-[6px] text-[10px] font-bold tracking-[0.08em] text-wi-paper uppercase">
          <Plus className="size-3" />
          Log
        </span>
      )}
    </>
  );

  if (!actionable) {
    return <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-wi-paper p-[14px]">{body}</div>;
  }

  return (
    <Link
      href={isToday ? '/checkin' : `/day/${day.localDate}`}
      className="flex items-center gap-3 rounded-lg border-[1.5px] border-wi-paper p-[14px] transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.99]"
    >
      {body}
    </Link>
  );
}
