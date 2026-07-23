import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { NumberField } from '@/components/NumberField';
import { RpeSlider } from '@/components/RpeSlider';
import { SessionTypeField } from '@/components/SessionTypeField';
import { saveSessionAction } from './actions';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const member = await requireMember();
  const localDate = localDateFor(member.timezone, new Date());

  // A member who hasn't been assigned a cohort start date yet is always
  // "pre", same treatment as /today and /checkin: never call getPhase with
  // a null start.
  const state = member.cohortStartDate ? getPhase(member.cohortStartDate, localDate).state : 'pre';

  if (state === 'pre' || state === 'complete') {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold">Log a session</h1>
        <div className="rounded-[10px] border border-black/10 bg-white p-5 text-sm opacity-70 dark:border-white/10 dark:bg-black">
          {state === 'pre'
            ? 'Session logging opens once your cohort starts.'
            : 'Protocol complete. Session logging is closed.'}
        </div>
      </div>
    );
  }

  // The serving toggle only ever applies in the "within" phase; baseline
  // sessions never ask the question, and the pure core forces the stored
  // value to null regardless of what a form might send.
  const showServingToggle = state === 'within';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Log a session</h1>
        <p className="mt-1 text-sm opacity-60">Log after any run over 45 min or a hard effort.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm">
          Please fill in every field before saving.
        </p>
      )}

      <form action={saveSessionAction} className="flex flex-col gap-5">
        <SessionTypeField />
        <RpeSlider name="rpe" />
        <NumberField name="durationMin" label="Duration (minutes)" min={1} max={600} step={1} />
        <NumberField name="distanceKm" label="Distance (km)" min={0} max={100} step={0.1} />

        {showServingToggle && (
          <label className="flex items-center justify-between gap-3 rounded-[10px] border border-black/10 bg-white p-5 text-sm font-medium dark:border-white/10 dark:bg-black">
            Took serving
            <input
              type="checkbox"
              name="tookServing"
              className="h-6 w-6 shrink-0 rounded-[6px] border border-black/20 accent-black dark:border-white/20 dark:accent-white"
            />
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-medium">
            Note (optional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="rounded-[6px] border border-black/20 bg-transparent px-3 py-3 text-base text-black placeholder:text-black/30 dark:border-white/20 dark:text-white dark:placeholder:text-white/30"
          />
        </div>

        <button
          type="submit"
          className="rounded-[6px] bg-black px-6 py-5 text-base font-semibold text-white dark:bg-white dark:text-black"
        >
          Log session
        </button>
      </form>
    </div>
  );
}
