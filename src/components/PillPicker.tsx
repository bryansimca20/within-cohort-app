'use client';

import { cn } from '@/lib/utils';

type PillPickerProps = {
  values: readonly number[];
  value: number;
  onChange: (value: number) => void;
  /** id of the element that labels the row, for the group's accessible name. */
  labelledBy: string;
  /** Tune the pills for a dark surface (selected inverts to white, unselected sits on an on-dark fill). */
  onDark?: boolean;
  /** `md` is the full 52px tap row (Hooper). `sm` is 44px, the tap-target floor, for a row nested inside a card. */
  size?: 'md' | 'sm';
};

/** A row of one-tap number pills. Controlled and form-agnostic: the caller owns the value and whatever hidden input submits it. */
export function PillPicker({ values, value, onChange, labelledBy, onDark = false, size = 'md' }: PillPickerProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex gap-2">
      {values.map((n) => {
        const selected = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={selected}
            className={cn(
              'flex-1 rounded-[8px] border font-bold transition duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.97]',
              size === 'sm' ? 'h-11 text-[15px]' : 'h-[52px] text-[17px]',
              onDark
                ? selected
                  ? 'bg-wi-paper text-wi-black border-wi-paper'
                  : 'bg-wi-on-dark-fill text-wi-on-dark-2 border-wi-on-dark-line'
                : selected
                  ? 'bg-wi-black text-wi-paper border-wi-black'
                  : 'bg-wi-paper text-wi-ink-500 border-wi-line'
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
