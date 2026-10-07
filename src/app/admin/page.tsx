import { db } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { COHORT_TIMEZONE, getCohortStartDateOrNull } from '@/lib/cohort';
import { buildActivity, QUIET_DAYS } from '@/lib/activity';
import { localDateFor } from '@/lib/dates';
import { BASELINE_DAYS, WITHIN_DAYS, getPhase, phaseProgress } from '@/lib/phase';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { SubmitButton } from '@/components/SubmitButton';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnablePush } from '@/components/EnablePush';
import { SendTestPushButton } from '@/components/SendTestPushButton';
import { updateCohortStartAction } from './actions';

function phaseLabel(startDate: string, today: string): string {
  const { state, dayIndex } = getPhase(startDate, today);
  if (state === 'pre') return 'Not started';
  if (state === 'complete') return 'Complete';
  const { day, total } = phaseProgress(state, dayIndex);
  return `${state === 'baseline' ? 'Baseline' : 'On Within'} · Day ${day} / ${total}`;
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

      {startDate ? <Dashboard startDate={startDate} /> : null}

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

    </div>
  );
}

/** The founder dashboard proper: today's completion, who has gone quiet, and every member's logging across the protocol. Only rendered once a start date exists (buildActivity needs it to lay out the calendar). */
async function Dashboard({ startDate }: { startDate: string }) {
  const now = new Date();
  const rows = await buildActivity(db, now, startDate);
  const total = rows.length;
  const checkedIn = rows.filter((r) => r.checkedInToday).length;
  const completionPct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
  const missing = rows.filter((r) => !r.checkedInToday);
  const quiet = rows.filter((r) => r.daysQuiet >= QUIET_DAYS);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-wi-black">Today</h2>
        <p className="mt-1 text-sm text-wi-ink-500">
          {phaseLabel(startDate, localDateFor(COHORT_TIMEZONE, now))}
          <br />
          {checkedIn} / {total} checked in ({completionPct}%)
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">Missing today</p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-wi-black">
              {missing.length === 0 ? 'Everyone has checked in.' : missing.map((r) => r.name).join(', ')}
            </p>
          </div>
          <div className="border-t border-wi-line pt-4">
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">
              No check-in for {QUIET_DAYS}+ days
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-wi-black">
              {quiet.length === 0 ? 'Nobody.' : quiet.map((r) => `${r.name} (${r.daysQuiet})`).join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-wi-black">Activity</h2>
        <p className="mt-1 text-sm text-wi-ink-500">
          Quietest first. Filled is a check-in, a dot is a session, the droplet count is servings logged that day.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="text-sm text-wi-ink-500">No members are currently in the cohort.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <ActivityCalendar key={row.id} member={row} startDate={startDate} totalDays={BASELINE_DAYS + WITHIN_DAYS} />
          ))}
        </div>
      )}
    </>
  );
}
