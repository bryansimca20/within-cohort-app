'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

type SwitchProps = SwitchPrimitive.Root.Props & {
  /** Surface the switch sits on. `light` (default) is the paper-card styling:
   *  mist track, solid black fill and paper thumb when checked. `dark` inverts
   *  the fill so "on" still reads as the bright/filled state on a black
   *  surface. A black-on-black track would otherwise make the checked state
   *  look empty. */
  tone?: 'light' | 'dark';
};

/** WITHIN-restyled switch. On both tones the checked state is the high-contrast,
 *  filled one; the unchecked track stays quiet against its own surface. */
function Switch({ className, tone = 'light', ...props }: SwitchProps) {
  const track =
    tone === 'dark'
      ? 'border-wi-on-dark-line bg-wi-on-dark-fill focus-visible:border-wi-paper focus-visible:ring-white/25 data-checked:border-wi-paper data-checked:bg-wi-paper'
      : 'border-wi-line bg-wi-mist focus-visible:border-wi-black focus-visible:ring-black/15 data-checked:border-wi-black data-checked:bg-wi-black';
  const thumb =
    tone === 'dark'
      ? 'bg-wi-on-dark-3 data-checked:bg-wi-black'
      : 'bg-wi-paper';

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors outline-none after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-40',
        track,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full shadow-[var(--wi-shadow-sm)] transition-[transform,background-color] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] data-checked:translate-x-[18px]',
          thumb
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
