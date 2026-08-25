'use client';

import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type ServingToggleFieldProps = {
  name: string;
  defaultChecked?: boolean;
};

/** The within-phase "Took a serving" question. The Switch stays uncontrolled so
 *  Base UI keeps owning the hidden input that submits under `name`; local state
 *  only drives the readout. State is encoded three ways on purpose (knob
 *  position, a faint card fill, and a literal Yes/No) because a lone switch on a
 *  black surface was being misread as the opposite of its value. The card border
 *  stays a constant hairline; brightening it read as an unwanted selection ring. */
export function ServingToggleField({ name, defaultChecked = false }: ServingToggleFieldProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div
      data-checked={checked || undefined}
      className="flex items-center gap-3 rounded-lg border border-wi-on-dark-line p-4 text-wi-paper transition-colors data-checked:bg-wi-on-dark-fill"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold">Took a serving</p>
        <p className="text-xs text-wi-on-dark-2">One serving per qualifying session</p>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.04em]',
          checked ? 'text-wi-on-dark-1' : 'text-wi-on-dark-3'
        )}
      >
        {checked ? 'Yes' : 'No'}
      </span>
      <Switch
        tone="dark"
        name={name}
        aria-label="Took a serving"
        defaultChecked={defaultChecked}
        onCheckedChange={setChecked}
      />
    </div>
  );
}
