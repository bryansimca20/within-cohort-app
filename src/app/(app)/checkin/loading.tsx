import { Skeleton } from '@/components/ui/skeleton';

/** Check-in skeleton: title + watch inputs + the four Hooper rows + note + submit, matching the form so the real page lands with no shift. */
export default function CheckinLoading() {
  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-3 w-32" />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-11 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }, (_, j) => (
                  <Skeleton key={j} className="h-[52px] flex-1 rounded-[8px]" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[54px] w-full" />
      </div>
    </div>
  );
}
