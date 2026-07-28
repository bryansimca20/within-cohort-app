import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDate } from '@/lib/cohort';
import { NumberField } from '@/components/NumberField';
import { HooperPicker } from '@/components/HooperPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveCheckinAction } from './actions';

/** Short "Jul 28" label for the header sub-line, pinned to UTC so a negative-offset server timezone can't roll the plain 'YYYY-MM-DD' date back a day. */
function formatDateLabel(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Header sub-line phase word; only 'baseline'/'within' ever reach here, since 'pre'/'complete' return earlier. */
function checkinPhaseLabel(phase: 'baseline' | 'within'): string {
  return phase === 'baseline' ? 'Baseline' : 'Within';
}

/** Morning check-in: recovery/resting HR/sleep from the watch, the Hooper index, and an optional note. Same-day editable, phase-gated. */
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const member = await requireMember();
  const localDate = localDateFor(COHORT_TIMEZONE, new Date());
  const state = getPhase(getCohortStartDate(), localDate).state;

  if (state === 'pre' || state === 'complete') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
        <p className="text-sm text-wi-ink-500">
          {state === 'pre'
            ? 'Check-ins open once your cohort starts.'
            : 'Protocol complete. Check-ins are closed.'}
        </p>
      </div>
    );
  }

  // Only ever looks up *today's* row (matched on member + today's localDate),
  // so this is the one and only checkin that can be edited from this page.
  const [existing] = await db
    .select()
    .from(dailyCheckins)
    .where(and(eq(dailyCheckins.memberId, member.id), eq(dailyCheckins.localDate, localDate)))
    .limit(1);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <ScreenHeader
        title="Morning check-in"
        backHref="/today"
        right={<span className="text-2xs font-bold uppercase tracking-[0.1em] text-wi-on-dark-3">~20s</span>}
        sub={`${formatDateLabel(localDate)} · ${checkinPhaseLabel(state)}`}
      />

      <div className="flex flex-col gap-6 px-[22px] pt-[22px] pb-8">
        {error && (
          <p role="alert" className="text-sm text-wi-black">
            Please fill in every field before saving.
          </p>
        )}

        <form action={saveCheckinAction} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label>From your watch</Label>
            <NumberField
              name="recovery"
              label="Recovery score (0-100)"
              min={0}
              max={100}
              step={1}
              defaultValue={existing?.recovery}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <NumberField
                  name="restingHr"
                  label="Resting heart rate (bpm)"
                  min={25}
                  max={120}
                  step={1}
                  defaultValue={existing?.restingHr}
                />
              </div>
              <div className="flex-1">
                <NumberField
                  name="sleepHours"
                  label="Sleep (hours)"
                  min={0}
                  max={16}
                  step={0.1}
                  defaultValue={existing?.sleepHours}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <Label>How you feel</Label>
              <span className="text-2xs text-wi-ink-300">1 low · 5 high</span>
            </div>
            <HooperPicker
              name="hooperSleep"
              label="Sleep quality"
              anchor="poor → great"
              defaultValue={existing?.hooperSleep ?? 3}
            />
            <HooperPicker
              name="hooperFatigue"
              label="Fatigue"
              anchor="fresh → wrecked"
              defaultValue={existing?.hooperFatigue ?? 3}
            />
            <HooperPicker
              name="hooperSoreness"
              label="Soreness"
              anchor="none → severe"
              defaultValue={existing?.hooperSoreness ?? 3}
            />
            <HooperPicker
              name="hooperStress"
              label="Stress"
              anchor="calm → tense"
              defaultValue={existing?.hooperStress ?? 3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              name="note"
              rows={2}
              defaultValue={existing?.note ?? ''}
              placeholder="Anything worth remembering about today."
            />
          </div>

          <Button type="submit" size="lg" className="h-auto w-full py-5 text-base normal-case tracking-normal">
            {existing ? 'Update check-in' : 'Save check-in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
