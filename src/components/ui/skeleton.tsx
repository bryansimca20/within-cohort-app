import { cn } from '@/lib/utils';

/** A placeholder block for loading states: a faint on-dark fill with a gentle pulse (the pulse is stripped under prefers-reduced-motion by the global reset). Sized by the caller via className. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-wi-on-dark-fill', className)} {...props} />;
}

export { Skeleton };
