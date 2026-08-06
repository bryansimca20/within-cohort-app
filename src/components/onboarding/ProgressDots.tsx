import { cn } from '@/lib/utils';

/** A row of step dots: the dot at `current` is a wide fill, past dots are small fills, future dots are faint. Presentational only; the parent owns the step index. */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-testid="progress-dot"
          data-active={i === current}
          className={cn(
            'h-1 rounded-full transition-all duration-[var(--wi-duration-base)] ease-[var(--wi-ease-out)]',
            i === current ? 'w-5 bg-wi-paper' : i < current ? 'w-1 bg-wi-paper' : 'w-1 bg-wi-on-dark-3'
          )}
        />
      ))}
    </div>
  );
}
