'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/** WITHIN-restyled field label: uppercase, bold, wide tracking, micro size. */
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-2xs font-bold uppercase leading-none tracking-[0.14em] text-wi-ink-500 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Label };
