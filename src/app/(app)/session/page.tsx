import { RouteIcon } from 'lucide-react';
import { requireMember } from '@/lib/session';
import { getPhase } from '@/lib/phase';
import { localDateFor } from '@/lib/dates';
import { NumberField } from '@/components/NumberField';
import { RpeSlider } from '@/components/RpeSlider';
import { SessionTypeField } from '@/components/SessionTypeField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
        <h1 className="text-2xl font-semibold text-wi-black">Log a session</h1>
        <Card>
          <CardContent className="text-sm text-wi-ink-500">
            {state === 'pre'
              ? 'Session logging opens once your cohort starts.'
              : 'Protocol complete. Session logging is closed.'}
          </CardContent>
        </Card>
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
        <h1 className="text-2xl font-semibold text-wi-black">Log a session</h1>
        <p className="mt-1 text-sm text-wi-ink-500">Log after any run over 45 min or a hard effort.</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-wi-black">
          Please fill in every field before saving.
        </p>
      )}

      <form action={saveSessionAction} className="flex flex-col gap-5">
        <SessionTypeField />
        <RpeSlider name="rpe" />
        <NumberField name="durationMin" label="Duration (minutes)" min={1} max={600} step={1} />
        <NumberField name="distanceKm" label="Distance (km)" min={0} max={100} step={0.1} />

        {showServingToggle && (
          <Card>
            <CardContent>
              {/* Native checkbox semantics, unchanged: the shadcn Checkbox
                  renders a real hidden <input type="checkbox">. Unchecked, it
                  submits nothing; checked, and with no `value` prop set, it
                  falls back to the browser's native default value of "on",
                  exactly the wire format saveSessionAction already parses
                  (`tookServingRaw === 'true' || tookServingRaw === 'on'`).
                  Verified via FormData in a throwaway render test before
                  shipping this. */}
              <Label htmlFor="tookServing" className="flex items-center justify-between gap-3 normal-case">
                <span className="text-sm font-medium text-wi-black">Took serving</span>
                <Checkbox id="tookServing" name="tookServing" className="size-6" />
              </Label>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" name="note" rows={3} />
        </div>

        <Button type="submit" size="lg" className="h-auto py-5 text-base normal-case tracking-normal">
          <RouteIcon />
          Log session
        </Button>
      </form>
    </div>
  );
}
