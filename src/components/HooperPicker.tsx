'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

type HooperPickerProps = {
  name: string;
  label: string;
  anchor?: string;
  defaultValue?: number;
};

const VALUES = [1, 2, 3, 4, 5] as const;

/** A Hooper-index 1-5 tap-pill row; a hidden input mirrors the selected value so the field submits under `name` in FormData. */
export function HooperPicker({ name, label, anchor, defaultValue = 3 }: HooperPickerProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-sm font-semibold">
          {label}
        </span>
        {anchor ? <span className="text-[11px] text-wi-ink-500">{anchor}</span> : null}
      </div>
      <div role="group" aria-labelledby={id} className="flex gap-2">
        {VALUES.map((n) => {
          const selected = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              aria-pressed={selected}
              className={cn(
                'h-[52px] flex-1 rounded-[8px] border text-[17px] font-bold transition duration-[120ms]',
                selected
                  ? 'bg-wi-black text-wi-paper border-wi-black'
                  : 'bg-wi-paper text-wi-ink-500 border-wi-line'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
