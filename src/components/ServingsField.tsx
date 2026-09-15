'use client';

import { useId, useState } from 'react';

import { PillPicker } from '@/components/PillPicker';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type ServingsFieldProps = {
  name: string;
  /** Stored count when editing: null or 0 starts the toggle off, 1-4 starts it on with that count. */
  defaultValue?: number | null;
};

const COUNTS = [1, 2, 3, 4] as const;

/** The within-phase servings question: a "Took a serving" switch that, once on,
 *  reveals a 1-4 count row. Toggle first keeps "No" the one-tap default, since
 *  most answers are none or one. One hidden input submits the answer under
 *  `name` (0 when off, the count when on); the Switch is deliberately unnamed so
 *  Base UI's own hidden checkbox never posts a second value. The count survives
 *  toggling off and on again. On/off is encoded three ways on purpose (knob
 *  position, a faint card fill, and a literal Yes/No) because a lone switch on a
 *  black surface was being misread as the opposite of its value. */
export function ServingsField({ name, defaultValue }: ServingsFieldProps) {
  const labelId = useId();
  const startsOn = !!defaultValue && defaultValue > 0;
  const [checked, setChecked] = useState(startsOn);
  const [count, setCount] = useState(startsOn && defaultValue ? defaultValue : 1);

  return (
    <div
      data-checked={checked || undefined}
      className="flex flex-col gap-4 rounded-lg border border-wi-on-dark-line p-4 text-wi-paper transition-colors data-checked:bg-wi-on-dark-fill"
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm font-semibold">Took a serving</p>
        <span
          aria-hidden="true"
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.04em]',
            checked ? 'text-wi-on-dark-1' : 'text-wi-on-dark-3'
          )}
        >
          {checked ? 'Yes' : 'No'}
        </span>
        <Switch tone="dark" aria-label="Took a serving" defaultChecked={startsOn} onCheckedChange={setChecked} />
      </div>

      {checked && (
        <div className="flex flex-col gap-2">
          <span id={labelId} className="text-xs text-wi-on-dark-2">
            How many
          </span>
          <PillPicker values={COUNTS} value={count} onChange={setCount} labelledBy={labelId} onDark size="sm" />
        </div>
      )}

      <input type="hidden" name={name} value={checked ? count : 0} />
    </div>
  );
}
