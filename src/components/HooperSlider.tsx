'use client';

import { useId, useState } from 'react';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type HooperSliderProps = {
  name: string;
  label: string;
  defaultValue?: number;
};

// A Hooper-index item: always a 1 (low) to 5 (high) integer scale. Kept
// controlled so the visible "current value" readout stays in sync with the
// thumb. The shadcn Slider drives the visual control; a hidden input mirrors
// its value so the field reliably submits under `name` in FormData rather
// than depending on Base UI's own internal form-input wiring.
export function HooperSlider({ name, label, defaultValue = 3 }: HooperSliderProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-wi-black">{value}</span>
      </div>
      <Slider
        id={id}
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
      />
      <input type="hidden" name={name} value={value} />
      <div className="flex justify-between text-xs text-wi-ink-300">
        <span>1 low</span>
        <span>5 high</span>
      </div>
    </div>
  );
}
