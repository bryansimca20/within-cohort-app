type NumberFieldProps = {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue?: number | string;
};

// Plain labelled numeric input, no client-side state: value lives on the DOM
// node itself and is read straight out of FormData on submit, same as every
// other field in the check-in form. `inputMode="decimal"` brings up a numeric
// keypad (with a decimal point) on mobile without changing the input's type
// away from "number", so browser min/max/step validation still applies.
export function NumberField({ name, label, min, max, step, defaultValue }: NumberFieldProps) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        required
        className="rounded-[6px] border border-black/20 bg-transparent px-3 py-3 text-base text-black placeholder:text-black/30 dark:border-white/20 dark:text-white dark:placeholder:text-white/30"
      />
    </div>
  );
}
