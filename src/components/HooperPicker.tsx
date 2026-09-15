'use client';

import { useId, useState } from 'react';

import { PillPicker } from '@/components/PillPicker';
import { cn } from '@/lib/utils';

type HooperPickerProps = {
  name: string;
  label: string;
  anchor?: string;
  defaultValue?: number;
  /** Tune the pills + anchor for a dark surface (selected inverts to white, unselected sits on an on-dark fill). */
  onDark?: boolean;
};

const VALUES = [1, 2, 3, 4, 5] as const;

/** A Hooper-index 1-5 tap-pill row; a hidden input mirrors the selected value so the field submits under `name` in FormData. */
export function HooperPicker({ name, label, anchor, defaultValue = 3, onDark = false }: HooperPickerProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-sm font-semibold">
          {label}
        </span>
        {anchor ? (
          <span className={cn('text-2xs', onDark ? 'text-wi-on-dark-3' : 'text-wi-ink-500')}>{anchor}</span>
        ) : null}
      </div>
      <PillPicker values={VALUES} value={value} onChange={setValue} labelledBy={id} onDark={onDark} />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
