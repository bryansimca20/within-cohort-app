import * as React from 'react';

import { cn } from '@/lib/utils';

/** WITHIN-restyled multi-line input: hairline border, black focus ring. */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-[var(--wi-radius-control)] border border-wi-line bg-wi-paper px-[14px] py-[10px] text-base leading-normal text-wi-black outline-none transition-[border-color,background-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] placeholder:text-wi-ink-300 focus-visible:border-wi-black focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[1.5px] aria-invalid:border-wi-black',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
