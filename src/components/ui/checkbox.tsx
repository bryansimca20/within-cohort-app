'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/** WITHIN-restyled checkbox: hairline box, solid black fill when checked. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-5 shrink-0 items-center justify-center rounded-[var(--wi-radius-control)] border border-wi-line bg-wi-paper transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-wi-black focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[1.5px] aria-invalid:border-wi-black data-checked:border-wi-black data-checked:bg-wi-black data-checked:text-wi-paper',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
