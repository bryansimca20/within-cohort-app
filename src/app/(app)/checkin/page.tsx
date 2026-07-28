import { and, eq } from 'drizzle-orm';
import { SaveIcon } from 'lucide-react';
import { db } from '@/db/client';
import { dailyCheckins } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDate } from '@/lib/cohort';
import { NumberField } from '@/components/NumberField';
import { HooperSlider } from '@/components/HooperSlider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveCheckinAction } from './actions';

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
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold text-wi-black">Morning check-in</h1>
        <Card>
          <CardContent className="text-sm text-wi-ink-500">
            {state === 'pre'
              ? 'Check-ins open once your cohort starts.'
              : 'Protocol complete. Check-ins are closed.'}
          </CardContent>
        </Card>
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
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wi-black">Morning check-in</h1>
        <p className="mt-1 text-sm text-wi-ink-500">
          {existing ? 'Already saved today. Edit and update anytime before tomorrow.' : 'Takes about a minute.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-wi-black">
          Please fill in every field before saving.
        </p>
      )}

      <form action={saveCheckinAction} className="flex flex-col gap-5">
        <NumberField
          name="recovery"
          label="Recovery score (0-100)"
          min={0}
          max={100}
          step={1}
          defaultValue={existing?.recovery}
        />
        <NumberField
          name="restingHr"
          label="Resting heart rate (bpm)"
          min={25}
          max={120}
          step={1}
          defaultValue={existing?.restingHr}
        />
        <NumberField
          name="sleepHours"
          label="Sleep (hours)"
          min={0}
          max={16}
          step={0.1}
          defaultValue={existing?.sleepHours}
        />

        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-wi-ink-500">Hooper index</p>
            <HooperSlider name="hooperSleep" label="Sleep quality" defaultValue={existing?.hooperSleep ?? 3} />
            <HooperSlider name="hooperFatigue" label="Fatigue" defaultValue={existing?.hooperFatigue ?? 3} />
            <HooperSlider name="hooperSoreness" label="Soreness" defaultValue={existing?.hooperSoreness ?? 3} />
            <HooperSlider name="hooperStress" label="Stress" defaultValue={existing?.hooperStress ?? 3} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" name="note" rows={3} defaultValue={existing?.note ?? ''} />
        </div>

        <Button type="submit" size="lg" className="h-auto py-5 text-base normal-case tracking-normal">
          <SaveIcon />
          {existing ? 'Update' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
