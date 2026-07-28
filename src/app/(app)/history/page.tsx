import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getCohortStartDate } from '@/lib/cohort';
import { getTodayStatus } from '@/lib/today';
import { groupByDate } from '@/lib/history';
import { HistoryDayCard } from '@/components/HistoryDayCard';

/** Runner-facing History: streak + active-phase completion stat cards over a reverse-chronological list of expandable day cards. */
export default async function HistoryPage() {
  const member = await requireMember();
  const startDate = getCohortStartDate();
  const status = await getTodayStatus(db, member, new Date(), startDate);

  const checkins = await db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.memberId, member.id))
    .orderBy(desc(dailyCheckins.localDate));

  const sessions = await db
    .select()
    .from(sessionLogs)
    .where(eq(sessionLogs.memberId, member.id))
    .orderBy(desc(sessionLogs.localDate));

  const days = groupByDate(checkins, sessions);

  const isWithin = status.phaseState === 'within' || status.phaseState === 'complete';
  const logged = isWithin ? status.withinLogged : status.baselineLogged;
  const total = isWithin ? 28 : 14;
  const pct = total ? Math.round((logged / total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-[22px] pt-[10px]">
      <h1 className="text-h2 font-bold tracking-[-0.02em] text-wi-black uppercase">History</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-wi-line bg-wi-paper p-[14px]">
          <div className="text-2xl leading-none font-bold text-wi-black">{status.streak}</div>
          <p className="mt-[5px] text-[10px] font-bold tracking-[0.1em] text-wi-ink-500 uppercase">Day streak</p>
        </div>
        <div className="rounded-lg border border-wi-line bg-wi-paper p-[14px]">
          <div className="text-2xl leading-none font-bold text-wi-black">{pct}%</div>
          <p className="mt-[5px] text-[10px] font-bold tracking-[0.1em] text-wi-ink-500 uppercase">
            {isWithin ? 'Within' : 'Baseline'} complete
          </p>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-wi-ink-500">
          No entries yet.{' '}
          <Link href="/checkin" className="font-medium text-wi-black underline">
            Log today&apos;s check-in
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {days.map((day) => (
            <HistoryDayCard key={day.localDate} day={day} isToday={day.localDate === status.localDate} />
          ))}
        </div>
      )}
    </div>
  );
}
