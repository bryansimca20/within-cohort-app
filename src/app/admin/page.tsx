import Link from 'next/link';
import { db } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { buildDashboard, type DashboardRow } from '@/lib/dashboard';

function phaseLabel(row: DashboardRow): string {
  if (row.phaseState === 'pre') return 'Not started';
  if (row.phaseState === 'baseline') return `Baseline · Day ${row.dayIndex + 1} / 14`;
  if (row.phaseState === 'within') return `On Within · Day ${row.dayIndex - 13} / 28`;
  return 'Complete';
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const rows = await buildDashboard(db, new Date());

  const total = rows.length;
  const checkedIn = rows.filter((r) => r.checkedInToday).length;
  const completionPct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
  const missing = rows.filter((r) => !r.checkedInToday);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="mt-1 text-sm opacity-70">
          {checkedIn} / {total} checked in ({completionPct}%)
        </p>
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <p className="text-xs uppercase tracking-[0.2em] opacity-50">Missing today</p>
        <p className="mt-1 text-sm font-medium leading-relaxed">
          {missing.length === 0 ? 'Everyone has checked in.' : missing.map((r) => r.name).join(', ')}
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-[10px] border border-black/10 bg-white p-5 text-sm opacity-70 dark:border-white/10 dark:bg-black">
          No members are currently in the cohort.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/admin/member/${row.id}`}
              className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{row.name}</p>
                <span className="text-xs font-medium opacity-50">{row.checkedInToday ? 'Checked in' : 'Not yet'}</span>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/10">
                <div className="flex items-center justify-between">
                  <dt className="opacity-70">Sessions today</dt>
                  <dd className="font-medium">{row.sessionCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="opacity-70">Phase</dt>
                  <dd className="font-medium">{phaseLabel(row)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
