import * as React from 'react';

import { cn } from '@/lib/utils';

/** WITHIN-restyled multi-line input: hairline border, black focus ring. */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-[var(--wi-radius-control)] border border-wi-line bg-wi-paper px-[14px] py-[10px] text-base leading-normal text-wi-black outline-none transition-[border-color,background-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] placeholder:text-wi-ink-300 focus-visible:border-wi-black focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[1.5px] aria-invalid:border-wi-black in-data-[surface=dark]:border-wi-on-dark-line in-data-[surface=dark]:bg-wi-on-dark-fill in-data-[surface=dark]:text-wi-paper in-data-[surface=dark]:placeholder:text-wi-on-dark-3 in-data-[surface=dark]:focus-visible:border-wi-paper in-data-[surface=dark]:focus-visible:ring-white/15',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
