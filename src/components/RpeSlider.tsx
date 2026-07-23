'use client';

import { useId, useState } from 'react';

type RpeSliderProps = {
  name: string;
  defaultValue?: number;
};

// Rate of Perceived Exertion for a logged session: 0 (rest) to 10 (max
// effort) integer scale. Kept controlled so the visible "current value"
// readout stays in sync with the thumb, mirroring HooperSlider's shape.
export function RpeSlider({ name, defaultValue = 5 }: RpeSliderProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          RPE (effort)
        </label>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <input
        id={id}
        name={name}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-[6px] bg-black/15 accent-black dark:bg-white/20 dark:accent-white"
      />
      <div className="flex justify-between text-xs opacity-50">
        <span>0 rest</span>
        <span>10 max</span>
      </div>
    </div>
  );
}
