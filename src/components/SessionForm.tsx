import { SESSION_TYPES } from '@/lib/validation';
import { NumberField } from '@/components/NumberField';
import { RpeSlider } from '@/components/RpeSlider';
import { ServingsField } from '@/components/ServingsField';
import { SessionTypeField } from '@/components/SessionTypeField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SessionFormExisting = {
  sessionType: (typeof SESSION_TYPES)[number];
  sessionTypeOther: string | null;
  rpe: number;
  durationMin: number;
  distanceKm: string;
  servings: number | null;
  note: string | null;
};

type SessionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  showServingToggle: boolean;
  submitLabel: string;
  from?: 'session' | 'history';
  existing?: SessionFormExisting;
};

/** The session log form body, shared by the create page (Log a session) and the
 *  edit route. Field names match sessionSchema keys. When `existing` is given,
 *  every field is prefilled; the serving toggle is shown only for within-phase
 *  sessions (the caller decides via `showServingToggle`). A hidden `from` field
 *  tells the update action where to redirect back to. */
export function SessionForm({ action, showServingToggle, submitLabel, from = 'history', existing }: SessionFormProps) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="from" value={from} />
      <SessionTypeField defaultValue={existing?.sessionType} defaultOtherValue={existing?.sessionTypeOther ?? ''} />
      <RpeSlider name="rpe" defaultValue={existing?.rpe} />
      <div className="flex gap-3">
        <div className="flex-1">
          <NumberField name="durationMin" label="Duration (min)" min={1} max={600} step={1} defaultValue={existing?.durationMin} />
        </div>
        <div className="flex-1">
          <NumberField name="distanceKm" label="Distance (km)" min={0} max={100} step={0.1} defaultValue={existing?.distanceKm} />
        </div>
      </div>

      {showServingToggle && (
        <ServingsField name="servings" defaultValue={existing?.servings ?? null} />
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} defaultValue={existing?.note ?? ''} placeholder="One sentence on how it went." />
      </div>

      <Button
        type="submit"
        variant="inverse"
        size="lg"
        className="h-auto w-full py-5 text-base normal-case tracking-normal"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
