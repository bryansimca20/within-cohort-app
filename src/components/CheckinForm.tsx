import { formatHhMm } from '@/lib/duration';
import type { CheckinRow } from '@/lib/history';
import { NumberField } from '@/components/NumberField';
import { DurationField } from '@/components/DurationField';
import { HooperPicker } from '@/components/HooperPicker';
import { SubmitButton } from '@/components/SubmitButton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/** The morning check-in form body, shared by the today screen and the day screen
 *  that backfills or corrects an earlier day. Field names match checkinSchema
 *  keys. When `existing` is given every field is prefilled, so the same form
 *  creates a new check-in and edits one already written. */
export function CheckinForm({
  action,
  existing,
}: {
  action: (formData: FormData) => void | Promise<void>;
  existing?: CheckinRow;
}) {
  return (
    <form action={action} className="flex flex-col gap-6">
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
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            name="restingHr"
            label="Resting HR (bpm)"
            min={25}
            max={120}
            step={1}
            defaultValue={existing?.restingHr}
          />
          <NumberField
            name="hrvMs"
            label="HRV (ms)"
            min={1}
            max={300}
            step={1}
            optional
            defaultValue={existing?.hrvMs ?? undefined}
          />
          <DurationField
            name="sleep"
            label="Sleep (h:mm)"
            defaultValue={existing ? formatHhMm(existing.sleepMinutes) : ''}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <Label>How you feel</Label>
          <span className="text-2xs text-wi-on-dark-3">1 low · 5 high</span>
        </div>
        <HooperPicker
          onDark
          name="hooperSleep"
          label="Sleep quality"
          anchor="poor → great"
          defaultValue={existing?.hooperSleep ?? 3}
        />
        <HooperPicker
          onDark
          name="hooperFatigue"
          label="Fatigue"
          anchor="fresh → wrecked"
          defaultValue={existing?.hooperFatigue ?? 3}
        />
        <HooperPicker
          onDark
          name="hooperSoreness"
          label="Soreness"
          anchor="none → severe"
          defaultValue={existing?.hooperSoreness ?? 3}
        />
        <HooperPicker
          onDark
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

      <SubmitButton
        variant="inverse"
        size="lg"
        pendingLabel="Saving"
        className="h-auto w-full py-5 text-base normal-case tracking-normal"
      >
        {existing ? 'Update check-in' : 'Save check-in'}
      </SubmitButton>
    </form>
  );
}
