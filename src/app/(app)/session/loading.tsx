import { Skeleton } from '@/components/ui/skeleton';

/** Session skeleton: title + info chip + type/RPE/duration/distance/note/submit, matching the form so the real page lands with no shift. */
export default function SessionLoading() {
  return (
    <div className="mx-auto w-full max-w-md px-[22px] pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-3 w-64" />

      <div className="mt-6 flex flex-col gap-6">
        <Skeleton className="h-10 w-full rounded-[8px]" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-14" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>

          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>

          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[54px] w-full" />
        </div>
      </div>
    </div>
  );
}
