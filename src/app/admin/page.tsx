import Link from 'next/link';
import { db } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { getCohortStartDateOrNull } from '@/lib/cohort';
import { buildDashboard, type DashboardRow } from '@/lib/dashboard';
import { BASELINE_DAYS, WITHIN_DAYS, phaseProgress } from '@/lib/phase';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/SubmitButton';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnablePush } from '@/components/EnablePush';
import { SendTestPushButton } from '@/components/SendTestPushButton';
import { updateCohortStartAction } from './actions';

function phaseLabel(row: DashboardRow): string {
  if (row.phaseState === 'pre') return 'Not started';
  if (row.phaseState === 'baseline') {
    const { day, total } = phaseProgress('baseline', row.dayIndex);
    return `Baseline · Day ${day} / ${total}`;
  }
  if (row.phaseState === 'within') {
    const { day, total } = phaseProgress('within', row.dayIndex);
    return `On Within · Day ${day} / ${total}`;
  }
  return 'Complete';
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ startSaved?: string; startError?: string }>;
}) {
  await requireAdmin();
  const { startSaved, startError } = await searchParams;
  const startDate = await getCohortStartDateOrNull(db);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wi-black">Cohort</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">Cohort start date</p>
            <p className="mt-1 text-sm text-wi-ink-500">
              Day 0 of the phase calendar, shared by every member. Baseline is the first {BASELINE_DAYS} days, Within the next{' '}
              {WITHIN_DAYS}.
            </p>
          </div>
          <form action={updateCohortStartAction} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startDate ?? ''}
                required
                className="w-auto"
              />
            </div>
            <SubmitButton pendingLabel="Saving">Save start date</SubmitButton>
          </form>
          {startSaved && <p className="text-sm font-medium text-wi-black">Start date saved.</p>}
          {startError && <p role="alert" className="text-sm text-wi-black">Enter a valid date.</p>}
          {!startDate && (
            <p className="text-sm text-wi-ink-500">
              Not set yet. Set the start date to open the cohort and start the phase calendar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">Notifications</p>
            <p className="mt-1 text-sm text-wi-ink-500">
              Verify Web Push in production. Turn on notifications on this device, then send yourself a test.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <EnablePush tone="light" />
            <SendTestPushButton />
          </div>
        </CardContent>
      </Card>

      {startDate ? <Dashboard startDate={startDate} /> : null}
    </div>
  );
}

/** The founder dashboard proper: today's completion + per-member rows. Only rendered once a start date exists (buildDashboard needs it to compute each member's phase). */
async function Dashboard({ startDate }: { startDate: string }) {
  const rows = await buildDashboard(db, new Date(), startDate);
  const total = rows.length;
  const checkedIn = rows.filter((r) => r.checkedInToday).length;
  const completionPct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
  const missing = rows.filter((r) => !r.checkedInToday);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-wi-black">Today</h2>
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
    </>
  );
}
