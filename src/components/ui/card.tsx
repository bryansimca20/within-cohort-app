import * as React from 'react';

import { cn } from '@/lib/utils';

/** WITHIN-restyled panel: hairline border, card radius, white on paper-dim. */
function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[var(--wi-radius-card)] border border-wi-line bg-wi-paper py-(--card-spacing) text-sm text-wi-black [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[var(--wi-radius-card)] *:[img:last-child]:rounded-b-[var(--wi-radius-card)]',
        className
      )}
      {...props}
    />
  );
}

/** Header row: title + optional trailing action, grid-aligned. */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-[var(--wi-radius-card)] px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className
      )}
      {...props}
    />
  );
}

/** Card title: bold, upright, no italics. */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-base leading-snug font-bold text-wi-black group-data-[size=sm]/card:text-sm',
        className
      )}
      {...props}
    />
  );
}

/** Muted sub-line under the title. */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-description" className={cn('text-sm text-wi-ink-500', className)} {...props} />
  );
}

/** Trailing action slot, pinned top-right of the header. */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

/** Body padding wrapper. */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />;
}

/** Footer strip with a hairline top rule and a faint mist fill. */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-[var(--wi-radius-card)] border-t border-wi-line bg-wi-mist/50 p-(--card-spacing)',
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
