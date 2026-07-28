import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { COHORT_TIMEZONE, getCohortStartDate } from '@/lib/cohort';
import { NumberField } from '@/components/NumberField';
import { RpeSlider } from '@/components/RpeSlider';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SessionTypeField } from '@/components/SessionTypeField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { saveSessionAction } from './actions';

/** Session log: type/RPE/duration/distance for any long, hard or race effort, plus the within-phase serving question. Event-triggered, phase-gated, multiple entries per day allowed. */
export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireMember();
  const localDate = localDateFor(COHORT_TIMEZONE, new Date());
  const state = getPhase(getCohortStartDate(), localDate).state;

  if (state === 'pre' || state === 'complete') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
        <p className="text-sm text-wi-ink-500">
          {state === 'pre'
            ? 'Session logging opens once your cohort starts.'
            : 'Protocol complete. Session logging is closed.'}
        </p>
      </div>
    );
  }

  // The serving toggle only ever applies in the "within" phase; baseline
  // sessions never ask the question, and the pure core forces the stored
  // value to null regardless of what a form might send.
  const showServingToggle = state === 'within';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <ScreenHeader
        title="Log a session"
        backHref="/today"
        sub="Only long, hard or race efforts. One entry each."
      />

      <div className="flex flex-col gap-6 px-[22px] pt-[22px] pb-8">
        {error && (
          <p role="alert" className="text-sm text-wi-black">
            Please fill in every field before saving.
          </p>
        )}

        <div className="rounded-[8px] bg-wi-mist px-[14px] py-[11px] text-xs text-wi-ink-700">
          Log after any run over ~45 min or a hard effort.
        </div>

        <form action={saveSessionAction} className="flex flex-col gap-5">
          <SessionTypeField />
          <RpeSlider name="rpe" />
          <div className="flex gap-3">
            <div className="flex-1">
              <NumberField name="durationMin" label="Duration (minutes)" min={1} max={600} step={1} />
            </div>
            <div className="flex-1">
              <NumberField name="distanceKm" label="Distance (km)" min={0} max={100} step={0.1} />
            </div>
          </div>

          {showServingToggle && (
            <div className="flex items-center gap-3 rounded-lg bg-wi-black p-4 text-wi-paper">
              <div className="flex-1">
                <p className="text-sm font-semibold">Took a serving</p>
                <p className="text-xs text-wi-on-dark-2">One serving per qualifying session</p>
              </div>
              {/* Switch wire format, unchanged from the Checkbox it replaces:
                  Base UI's Switch renders a real hidden <input type="checkbox">.
                  Unchecked, it submits nothing; checked, with no `value` prop
                  set, it falls back to the browser's native default value of
                  "on", exactly the wire format saveSessionAction already
                  parses (`tookServingRaw === 'true' || tookServingRaw === 'on'`).
                  Verified via FormData in tests/Switch.test.tsx before
                  shipping this. */}
              <Switch name="tookServing" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" name="note" rows={2} placeholder="One sentence on how it went." />
          </div>

          <Button type="submit" size="lg" className="w-full">
            Log session
          </Button>
        </form>
      </div>
    </div>
  );
}
