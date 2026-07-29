import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins, sessionLogs } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getCohortStartDate } from '@/lib/cohort';
import { LogOut } from 'lucide-react';
import { getTodayStatus } from '@/lib/today';
import { groupByDate } from '@/lib/history';
import { logout } from '@/app/login/actions';
import { HistoryDayCard } from '@/components/HistoryDayCard';
import { InstallCard } from '@/components/InstallCard';
import { EnablePush } from '@/components/EnablePush';

/** Runner-facing History (black screen): streak + active-phase completion stat cards over a reverse-chronological list of expandable day cards. */
export default async function HistoryPage() {
  const member = await requireMember();
  const startDate = await getCohortStartDate(db);
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
  const total = 14;
  const pct = total ? Math.round((logged / total) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col bg-wi-black text-wi-paper">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-[22px] pt-[18px] pb-28">
        <h1 className="text-h2 font-bold tracking-[-0.02em] text-wi-paper uppercase">History</h1>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-wi-on-dark-line p-[14px]">
            <div className="text-2xl leading-none font-bold text-wi-paper">{status.streak}</div>
            <p className="mt-[5px] text-[10px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">Day streak</p>
          </div>
          <div className="rounded-lg border border-wi-on-dark-line p-[14px]">
            <div className="text-2xl leading-none font-bold text-wi-paper">{pct}%</div>
            <p className="mt-[5px] text-[10px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">
              {isWithin ? 'Within' : 'Baseline'} complete
            </p>
          </div>
        </div>

        {days.length === 0 ? (
          <p className="text-sm text-wi-on-dark-2">
            No entries yet.{' '}
            <Link href="/checkin" className="font-medium text-wi-paper underline">
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

        <div className="mt-2 flex flex-col gap-3 border-t border-wi-on-dark-line pt-5">
          <InstallCard />
          <EnablePush />
          <form action={logout}>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-wi-on-dark-line text-2xs font-bold tracking-[0.1em] text-wi-on-dark-2 uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.98]"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
