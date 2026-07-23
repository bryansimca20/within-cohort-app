import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { dailyCheckins } from '@/db/schema';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { NumberField } from '@/components/NumberField';
import { HooperSlider } from '@/components/HooperSlider';
import { saveCheckinAction } from './actions';

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const member = await requireMember();
  const localDate = localDateFor(member.timezone, new Date());

  // A member who hasn't been assigned a cohort start date yet is always
  // "pre", same treatment as /today: never call getPhase with a null start.
  const state = member.cohortStartDate ? getPhase(member.cohortStartDate, localDate).state : 'pre';

  if (state === 'pre' || state === 'complete') {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold">Morning check-in</h1>
        <div className="rounded-[10px] border border-black/10 bg-white p-5 text-sm opacity-70 dark:border-white/10 dark:bg-black">
          {state === 'pre'
            ? 'Check-ins open once your cohort starts.'
            : 'Protocol complete. Check-ins are closed.'}
        </div>
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
        <h1 className="text-2xl font-semibold">Morning check-in</h1>
        <p className="mt-1 text-sm opacity-60">
          {existing ? 'Already saved today. Edit and update anytime before tomorrow.' : 'Takes about a minute.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm">
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

        <div className="flex flex-col gap-4 rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p className="text-xs uppercase tracking-[0.2em] opacity-50">Hooper index</p>
          <HooperSlider name="hooperSleep" label="Sleep quality" defaultValue={existing?.hooperSleep ?? 3} />
          <HooperSlider name="hooperFatigue" label="Fatigue" defaultValue={existing?.hooperFatigue ?? 3} />
          <HooperSlider name="hooperSoreness" label="Soreness" defaultValue={existing?.hooperSoreness ?? 3} />
          <HooperSlider name="hooperStress" label="Stress" defaultValue={existing?.hooperStress ?? 3} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-medium">
            Note (optional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={existing?.note ?? ''}
            className="rounded-[6px] border border-black/20 bg-transparent px-3 py-3 text-base text-black placeholder:text-black/30 dark:border-white/20 dark:text-white dark:placeholder:text-white/30"
          />
        </div>

        <button
          type="submit"
          className="rounded-[6px] bg-black px-6 py-5 text-base font-semibold text-white dark:bg-white dark:text-black"
        >
          {existing ? 'Update' : 'Save'}
        </button>
      </form>
    </div>
  );
}
