'use client';

import { useId, useState } from 'react';

type HooperSliderProps = {
  name: string;
  label: string;
  defaultValue?: number;
};

// A Hooper-index item: always a 1 (low) to 5 (high) integer scale. Kept
// controlled so the visible "current value" readout stays in sync with the
// thumb, while `name` + `defaultValue` are the only props the form actually
// needs to submit and pre-fill correctly.
export function HooperSlider({ name, label, defaultValue = 3 }: HooperSliderProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-[6px] bg-black/15 accent-black dark:bg-white/20 dark:accent-white"
      />
      <div className="flex justify-between text-xs opacity-50">
        <span>1 low</span>
        <span>5 high</span>
      </div>
    </div>
  );
}
