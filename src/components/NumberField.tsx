import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NumberFieldProps = {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number | string;
};

// Plain labelled numeric input, no client-side state: value lives on the DOM
// node itself (the shadcn Input renders a native <input>) and is read
// straight out of FormData on submit, same as every other field in the
// check-in form. `inputMode="decimal"` brings up a numeric keypad (with a
// decimal point) on mobile without changing the input's type away from
// "number", so browser min/max/step validation still applies.
export function NumberField({ name, label, min, max, step, defaultValue }: NumberFieldProps) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        required
      />
    </div>
  );
}
