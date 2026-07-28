'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

/** WITHIN-restyled switch: mist track, solid black fill and paper thumb when checked. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-wi-line bg-wi-mist p-0.5 transition-colors outline-none after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:border-wi-black focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:opacity-40 data-checked:border-wi-black data-checked:bg-wi-black',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-wi-paper shadow-[var(--wi-shadow-sm)] transition-transform duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] data-checked:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
