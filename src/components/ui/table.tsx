'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/** Scroll-safe table wrapper. */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm tabular-nums text-wi-black', className)}
        {...props}
      />
    </div>
  );
}

/** Header group: hairline rule under the label row. */
function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-wi-line', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t border-wi-line bg-wi-mist/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

/** Body row: hairline rule, faint mist highlight on hover. */
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-wi-line transition-colors hover:bg-wi-mist/40 data-[state=selected]:bg-wi-mist',
        className
      )}
      {...props}
    />
  );
}

/** Column head: uppercase, bold, wide tracking — the eyebrow voice applied to data. */
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle text-2xs font-bold whitespace-nowrap text-wi-ink-500 uppercase tracking-[0.14em] [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className={cn('mt-4 text-sm text-wi-ink-500', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
