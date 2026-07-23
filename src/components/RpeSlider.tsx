'use client';

import { useId, useState } from 'react';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

type RpeSliderProps = {
  name: string;
  defaultValue?: number;
};

// Rate of Perceived Exertion for a logged session: 0 (rest) to 10 (max
// effort) integer scale. Kept controlled so the visible "current value"
// readout stays in sync with the thumb, mirroring HooperSlider's shape. A
// hidden input mirrors the Slider's value so the field reliably submits
// under `name` in FormData rather than depending on Base UI's own internal
// form-input wiring.
export function RpeSlider({ name, defaultValue = 5 }: RpeSliderProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>RPE (effort)</Label>
        <span className="text-sm font-semibold tabular-nums text-wi-black">{value}</span>
      </div>
      <Slider
        id={id}
        min={0}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
      />
      <input type="hidden" name={name} value={value} />
      <div className="flex justify-between text-xs text-wi-ink-300">
        <span>0 rest</span>
        <span>10 max</span>
      </div>
    </div>
  );
}
