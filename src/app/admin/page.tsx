import Link from 'next/link';
import { db } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { getCohortStartDate } from '@/lib/cohort';
import { buildDashboard, type DashboardRow } from '@/lib/dashboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

function phaseLabel(row: DashboardRow): string {
  if (row.phaseState === 'pre') return 'Not started';
  if (row.phaseState === 'baseline') return `Baseline · Day ${row.dayIndex + 1} / 14`;
  if (row.phaseState === 'within') return `On Within · Day ${row.dayIndex - 13} / 28`;
  return 'Complete';
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const rows = await buildDashboard(db, new Date(), getCohortStartDate());

  const total = rows.length;
  const checkedIn = rows.filter((r) => r.checkedInToday).length;
  const completionPct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
  const missing = rows.filter((r) => !r.checkedInToday);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wi-black">Today</h1>
        <p className="mt-1 text-sm text-wi-ink-500">
          {checkedIn} / {total} checked in ({completionPct}%)
        </p>
      </div>

      <Card>
        <CardContent>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">Missing today</p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-wi-black">
            {missing.length === 0 ? 'Everyone has checked in.' : missing.map((r) => r.name).join(', ')}
          </p>
        </CardContent>
      </Card>

      {total === 0 ? (
        <Card>
          <CardContent className="text-sm text-wi-ink-500">No members are currently in the cohort.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <Link key={row.id} href={`/admin/member/${row.id}`}>
              <Card className="transition-colors hover:bg-wi-mist/40">
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-wi-black">{row.name}</p>
                    <Badge variant={row.checkedInToday ? 'default' : 'outline'}>
                      {row.checkedInToday ? 'Checked in' : 'Not yet'}
                    </Badge>
                  </div>
                  <dl className="mt-4 flex flex-col gap-2 border-t border-wi-line pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-wi-ink-500">Sessions today</dt>
                      <dd className="font-medium text-wi-black">{row.sessionCount}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-wi-ink-500">Phase</dt>
                      <dd className="font-medium text-wi-black">{phaseLabel(row)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
